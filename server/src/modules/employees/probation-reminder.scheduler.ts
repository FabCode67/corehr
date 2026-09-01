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

  /** How far into the past to still catch up on a probation date that
   *  should already have triggered a reminder — covers employees the old
   *  exact-day-match query (see doc comment below) silently skipped before
   *  this fix shipped. Not unbounded, so this doesn't dredge up reminders
   *  for probation periods that ended long ago. */
  private static readonly CATCH_UP_DAYS = 30

  /**
   * Scans for probation periods ending within the next DAYS_AHEAD days, or
   * that already ended in the last CATCH_UP_DAYS — a *range*, not a single
   * exact day. The original version of this query only matched employees
   * whose probationEndDate landed on exactly today+10, which meant any
   * employee whose date didn't happen to line up with a day the cron
   * actually ran (server downtime, a date entered by HR after the 10-day
   * mark had already passed, etc.) never got a reminder at all — this is
   * why "I'm not getting these emails" was a real bug, not just a timing
   * fluke. probationReminderSentAt is what keeps this now-wider range
   * query from re-notifying the same employee every day until their
   * probation ends — EmployeesService clears it back to null whenever HR
   * actually changes probationEndDate, so an extension gets its own fresh
   * reminder.
   */
  // TESTING ONLY — temporarily running every 20 minutes instead of
  // EVERY_DAY_AT_7AM so the probation reminder pipeline can be verified
  // end-to-end without waiting a full day. Revert to
  // `@Cron(CronExpression.EVERY_DAY_AT_7AM)` before shipping to production.
  @Cron("0 */20 * * * *")
  async checkProbationEndingSoon() {
    try {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)

      const windowStart = new Date(today)
      windowStart.setUTCDate(windowStart.getUTCDate() - ProbationReminderScheduler.CATCH_UP_DAYS)

      const windowEnd = new Date(today)
      windowEnd.setUTCDate(windowEnd.getUTCDate() + ProbationReminderScheduler.DAYS_AHEAD)
      windowEnd.setUTCHours(23, 59, 59, 999)

      const employees = await this.prisma.employee.findMany({
        where: {
          isActive: true,
          probationEndDate: { gte: windowStart, lte: windowEnd },
          probationReminderSentAt: null,
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
        const endDate = new Date(employee.probationEndDate!)
        const endDateStr = endDate.toISOString().slice(0, 10)
        const daysRemaining = Math.round((endDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
        const timing = daysRemaining >= 0 ? `in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}` : `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} ago`
        const employeeUrl = `/admin/employees/${employee.employeeNumber}`

        await this.notifications
          .create({
            recipientEmployeeId: employee.employeeNumber,
            type: NotificationType.PROBATION_ENDING_SOON,
            title: "Probation ending soon",
            message: `Your probation period ends on ${endDateStr} (${timing}). Please contact HR if you have questions.`,
            relatedEmployeeId: employee.employeeNumber,
            actionUrl: "/staff/profile",
          })
          .catch(() => undefined)

        await this.notifications
          .createForAllAdmins({
            type: NotificationType.PROBATION_ENDING_SOON_ADMIN,
            title: "Employee probation ending soon",
            message: `${employee.firstName} ${employee.lastName} (${employee.employeeNumber}) has probation ending on ${endDateStr} (${timing}).`,
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

        // Marked sent last, after every notification/email attempt above has
        // at least been queued — if this write itself failed we'd rather
        // risk a duplicate reminder tomorrow than silently drop this one.
        await this.prisma.employee
          .update({ where: { employeeNumber: employee.employeeNumber }, data: { probationReminderSentAt: new Date() } })
          .catch((error) => this.logger.error(`Failed to mark probation reminder sent for ${employee.employeeNumber}: ${(error as Error).message}`))
      }
    } catch (error) {
      this.logger.error(`Probation reminder scan failed: ${(error as Error).message}`, (error as Error).stack)
    }
  }
}
