import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { NotificationType } from "@prisma/client"

import { buildClientUrl } from "../../common/client-url.util"
import { PrismaService } from "../../prisma/prisma.service"
import { EmailService } from "../email/email.service"
import { NotificationsService } from "../leave/notifications/notifications.service"

@Injectable()
export class ProbationReminderScheduler {
  private readonly logger = new Logger(ProbationReminderScheduler.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly emailService: EmailService
  ) {}

  /** How many days out counts as "ending soon" — matches the equivalent
   *  contract-ending-soon reminder in contract-reminder.scheduler.ts. */
  private static readonly DAYS_AHEAD = 10

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async checkProbationEndingSoon() {
    try {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)

      const target = new Date(today)
      target.setUTCDate(target.getUTCDate() + ProbationReminderScheduler.DAYS_AHEAD)

      const targetStart = new Date(target)
      targetStart.setUTCHours(0, 0, 0, 0)

      const targetEnd = new Date(target)
      targetEnd.setUTCHours(23, 59, 59, 999)

      const employees = await this.prisma.employee.findMany({
        where: {
          isActive: true,
          probationEndDate: { gte: targetStart, lte: targetEnd },
        },
        select: {
          employeeNumber: true,
          firstName: true,
          lastName: true,
          email: true,
          probationEndDate: true,
        },
      })

      if (employees.length === 0) return

      const admins = await this.prisma.employee.findMany({
        where: { isAdmin: true, isActive: true },
        select: { employeeNumber: true, email: true, firstName: true, lastName: true },
      })

      for (const employee of employees) {
        const endDateStr = employee.probationEndDate ? new Date(employee.probationEndDate).toISOString().slice(0, 10) : ""
        const employeeUrl = `/admin/employees/${employee.employeeNumber}`

        await this.notifications
          .create({
            recipientEmployeeId: employee.employeeNumber,
            type: NotificationType.PROBATION_ENDING_SOON,
            title: "Probation ending soon",
            message: `Your probation period ends on ${endDateStr} (in ${ProbationReminderScheduler.DAYS_AHEAD} days). Please contact HR if you have questions.`,
            relatedEmployeeId: employee.employeeNumber,
            actionUrl: "/staff/profile",
          })
          .catch(() => undefined)

        await this.notifications
          .createForAllAdmins({
            type: NotificationType.PROBATION_ENDING_SOON_ADMIN,
            title: "Employee probation ending soon",
            message: `${employee.firstName} ${employee.lastName} (${employee.employeeNumber}) has probation ending on ${endDateStr} (in ${ProbationReminderScheduler.DAYS_AHEAD} days).`,
            relatedEmployeeId: employee.employeeNumber,
            actionUrl: employeeUrl,
          })
          .catch(() => undefined)

        await this.emailService
          .enqueue({
            templateKey: "probation_ending_soon",
            recipientEmail: employee.email,
            recipientEmployeeId: employee.employeeNumber,
            relatedModule: "employees",
            relatedEntityId: employee.employeeNumber,
            variables: {
              employee_name: `${employee.firstName} ${employee.lastName}`,
              end_date: endDateStr,
              employee_url: buildClientUrl("/staff/profile"),
            },
          })
          .catch(() => undefined)

        for (const admin of admins) {
          await this.emailService
            .enqueue({
              templateKey: "probation_ending_soon_admin",
              recipientEmail: admin.email,
              recipientEmployeeId: admin.employeeNumber,
              relatedModule: "employees",
              relatedEntityId: employee.employeeNumber,
              variables: {
                admin_name: `${admin.firstName} ${admin.lastName}`,
                employee_name: `${employee.firstName} ${employee.lastName}`,
                employee_number: employee.employeeNumber,
                end_date: endDateStr,
                employee_url: buildClientUrl(employeeUrl),
              },
            })
            .catch(() => undefined)
        }
      }
    } catch (error) {
      this.logger.error(`Probation reminder scan failed: ${(error as Error).message}`, (error as Error).stack)
    }
  }
}
