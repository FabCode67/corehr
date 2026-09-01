import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { NotificationType } from "@prisma/client"

import { buildClientUrl } from "../../common/client-url.util"
import { PrismaService } from "../../prisma/prisma.service"
import { EmailService } from "../email/email.service"
import { NotificationsService } from "../leave/notifications/notifications.service"

/**
 * Same "N days out" scan as ProbationReminderScheduler, for the other
 * fixed-end-date employment event: a TEMPORARY employee's contract
 * approaching Employee.contractEndDate. Only TEMPORARY contracts use
 * contractEndDate at all — Permanent/Graduate Trainee/Intern don't (see the
 * field's doc comment on the Employee model) — so this only ever scans that
 * one contract type.
 */
@Injectable()
export class ContractReminderScheduler {
  private readonly logger = new Logger(ContractReminderScheduler.name)

  /** Matches ProbationReminderScheduler.DAYS_AHEAD — kept as a separate
   *  constant since the two reminders are independent and could reasonably
   *  diverge later. */
  private static readonly DAYS_AHEAD = 10

  /** Matches ProbationReminderScheduler.CATCH_UP_DAYS — see that class's
   *  doc comment for why this range extends into the past at all. */
  private static readonly CATCH_UP_DAYS = 30

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly emailService: EmailService
  ) {}

  /**
   * Scans for TEMPORARY contracts ending within the next DAYS_AHEAD days,
   * or that already ended in the last CATCH_UP_DAYS — a *range*, not a
   * single exact day. See ProbationReminderScheduler.checkProbationEndingSoon()'s
   * doc comment for why the original exact-day-match version could
   * silently skip employees forever, and why contractReminderSentAt is
   * what keeps this wider range from re-notifying daily.
   */
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async checkContractEndingSoon() {
    try {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)

      const windowStart = new Date(today)
      windowStart.setUTCDate(windowStart.getUTCDate() - ContractReminderScheduler.CATCH_UP_DAYS)

      const windowEnd = new Date(today)
      windowEnd.setUTCDate(windowEnd.getUTCDate() + ContractReminderScheduler.DAYS_AHEAD)
      windowEnd.setUTCHours(23, 59, 59, 999)

      const employees = await this.prisma.employee.findMany({
        where: {
          isActive: true,
          contractType: "TEMPORARY",
          contractEndDate: { gte: windowStart, lte: windowEnd },
          contractReminderSentAt: null,
        },
        select: {
          employeeNumber: true,
          firstName: true,
          lastName: true,
          email: true,
          contractEndDate: true,
        },
      })

      if (employees.length === 0) return

      const admins = await this.prisma.employee.findMany({
        where: { isAdmin: true, isActive: true },
        select: { employeeNumber: true, email: true, firstName: true, lastName: true },
      })

      for (const employee of employees) {
        const endDate = new Date(employee.contractEndDate!)
        const endDateStr = endDate.toISOString().slice(0, 10)
        const daysRemaining = Math.round((endDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
        const timing = daysRemaining >= 0 ? `in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}` : `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} ago`
        const employeeUrl = `/admin/employees/${employee.employeeNumber}`

        await this.notifications
          .create({
            recipientEmployeeId: employee.employeeNumber,
            type: NotificationType.CONTRACT_ENDING_SOON,
            title: "Contract ending soon",
            message: `Your contract ends on ${endDateStr} (${timing}). Please contact HR if you have questions.`,
            relatedEmployeeId: employee.employeeNumber,
            actionUrl: "/staff/profile",
          })
          .catch(() => undefined)

        await this.notifications
          .createForAllAdmins({
            type: NotificationType.CONTRACT_ENDING_SOON_ADMIN,
            title: "Employee contract ending soon",
            message: `${employee.firstName} ${employee.lastName} (${employee.employeeNumber})'s contract ends on ${endDateStr} (${timing}).`,
            relatedEmployeeId: employee.employeeNumber,
            actionUrl: employeeUrl,
          })
          .catch(() => undefined)

        await this.emailService
          .enqueue({
            templateKey: "contract_ending_soon",
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
              templateKey: "contract_ending_soon_admin",
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

        await this.prisma.employee
          .update({ where: { employeeNumber: employee.employeeNumber }, data: { contractReminderSentAt: new Date() } })
          .catch((error) => this.logger.error(`Failed to mark contract reminder sent for ${employee.employeeNumber}: ${(error as Error).message}`))
      }
    } catch (error) {
      this.logger.error(`Contract reminder scan failed: ${(error as Error).message}`, (error as Error).stack)
    }
  }
}
