import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { NotificationType } from "@prisma/client"

import { buildClientUrl } from "../../../common/client-url.util"
import { PrismaService } from "../../../prisma/prisma.service"
import { EmailService } from "../../email/email.service"
import { NotificationsService } from "../notifications/notifications.service"

const EMPLOYEE_SELECT = {
  employeeNumber: true,
  firstName: true,
  lastName: true,
  email: true,
  position: {
    select: {
      department: {
        select: {
          headOfDepartment: {
            select: { employeeNumber: true, firstName: true, lastName: true, email: true },
          },
        },
      },
    },
  },
} as const

/**
 * Fires the employee-facing LEAVE_STARTING_SOON / RETURNING_TOMORROW
 * reminders (both NotificationType values existed in the schema already but
 * were never actually fired by anything — this scheduler finally wires them
 * up), plus a manager-facing counterpart (LEAVE_STARTING_SOON_MANAGER /
 * RETURNING_TOMORROW_MANAGER) sent only to the resolved Head of Department
 * of the employee going on/returning from leave — not broadcast to every
 * admin, per DepartmentDashboardService's headOfDepartmentId scoping model
 * (NotificationsService.create() still fans a copy out to every HR admin
 * automatically, same as every other notification in this app).
 *
 * Modeled directly on ProbationReminderScheduler's range+catch-up+dedup
 * pattern — see that scheduler's doc comment for why a single exact-day
 * match query is the wrong approach (a missed cron run would silently skip
 * the reminder forever). Only fires for APPROVED requests: a still-pending
 * request's dates aren't confirmed yet, so reminding anyone about them
 * would be premature.
 */
@Injectable()
export class LeaveReminderScheduler {
  private readonly logger = new Logger(LeaveReminderScheduler.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly emailService: EmailService
  ) {}

  /** "Starting soon" heads-up window — deliberately shorter than the
   *  probation/contract reminders' 10-day window, since leave is typically
   *  booked much closer to its actual start date than a contract milestone. */
  private static readonly STARTING_SOON_DAYS_AHEAD = 3
  /** "Returning tomorrow" is meant literally (per the NotificationType's own
   *  name) — a 1-day-ahead window, still with a catch-up range below so a
   *  missed cron run isn't a silently lost reminder. */
  private static readonly RETURNING_DAYS_AHEAD = 1
  private static readonly CATCH_UP_DAYS = 7

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async checkStartingSoon() {
    try {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      const windowStart = new Date(today)
      windowStart.setUTCDate(windowStart.getUTCDate() - LeaveReminderScheduler.CATCH_UP_DAYS)
      const windowEnd = new Date(today)
      windowEnd.setUTCDate(windowEnd.getUTCDate() + LeaveReminderScheduler.STARTING_SOON_DAYS_AHEAD)
      windowEnd.setUTCHours(23, 59, 59, 999)

      const requests = await this.prisma.leaveRequest.findMany({
        where: { status: "APPROVED", startDate: { gte: windowStart, lte: windowEnd }, startingSoonNotifiedAt: null },
        include: { employee: { select: EMPLOYEE_SELECT }, leaveType: { select: { name: true } } },
      })
      if (requests.length === 0) return

      for (const request of requests) {
        const startDateStr = request.startDate.toISOString().slice(0, 10)
        const employeeName = `${request.employee.firstName} ${request.employee.lastName}`
        const leaveUrl = "/staff/leave"

        await this.notifications
          .create({
            recipientEmployeeId: request.employeeId,
            type: NotificationType.LEAVE_STARTING_SOON,
            title: "Your leave starts soon",
            message: `Your ${request.leaveType.name} starts on ${startDateStr}.`,
            relatedLeaveRequestId: request.id,
            actionUrl: leaveUrl,
          })
          .catch(() => undefined)

        await this.emailService
          .enqueue({
            templateKey: "leave_starting_soon",
            recipientEmail: request.employee.email,
            recipientEmployeeId: request.employeeId,
            relatedModule: "leave",
            relatedEntityId: request.id,
            variables: {
              employee_name: employeeName,
              leave_type: request.leaveType.name,
              start_date: startDateStr,
              leave_url: buildClientUrl(leaveUrl),
            },
          })
          .catch(() => undefined)

        const head = request.employee.position?.department.headOfDepartment
        if (head) {
          const managerUrl = "/staff/department-dashboard/leave"
          await this.notifications
            .create({
              recipientEmployeeId: head.employeeNumber,
              type: NotificationType.LEAVE_STARTING_SOON_MANAGER,
              title: "Team member going on leave soon",
              message: `${employeeName}'s ${request.leaveType.name} starts on ${startDateStr}.`,
              relatedLeaveRequestId: request.id,
              actionUrl: managerUrl,
            })
            .catch(() => undefined)

          await this.emailService
            .enqueue({
              templateKey: "leave_starting_soon_manager",
              recipientEmail: head.email,
              recipientEmployeeId: head.employeeNumber,
              relatedModule: "leave",
              relatedEntityId: request.id,
              variables: {
                manager_name: `${head.firstName} ${head.lastName}`,
                employee_name: employeeName,
                leave_type: request.leaveType.name,
                start_date: startDateStr,
                leave_url: buildClientUrl(managerUrl),
              },
            })
            .catch(() => undefined)
        }

        await this.prisma.leaveRequest
          .update({ where: { id: request.id }, data: { startingSoonNotifiedAt: new Date() } })
          .catch((error) => this.logger.error(`Failed to mark starting-soon reminder sent for ${request.id}: ${(error as Error).message}`))
      }
    } catch (error) {
      this.logger.error(`Leave starting-soon scan failed: ${(error as Error).message}`, (error as Error).stack)
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async checkReturningTomorrow() {
    try {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      const windowStart = new Date(today)
      windowStart.setUTCDate(windowStart.getUTCDate() - LeaveReminderScheduler.CATCH_UP_DAYS)
      const windowEnd = new Date(today)
      windowEnd.setUTCDate(windowEnd.getUTCDate() + LeaveReminderScheduler.RETURNING_DAYS_AHEAD)
      windowEnd.setUTCHours(23, 59, 59, 999)

      const requests = await this.prisma.leaveRequest.findMany({
        where: { status: "APPROVED", returnDate: { gte: windowStart, lte: windowEnd }, returningSoonNotifiedAt: null },
        include: { employee: { select: EMPLOYEE_SELECT }, leaveType: { select: { name: true } } },
      })
      if (requests.length === 0) return

      for (const request of requests) {
        const returnDateStr = request.returnDate.toISOString().slice(0, 10)
        const employeeName = `${request.employee.firstName} ${request.employee.lastName}`
        const leaveUrl = "/staff/leave"

        await this.notifications
          .create({
            recipientEmployeeId: request.employeeId,
            type: NotificationType.RETURNING_TOMORROW,
            title: "You return from leave soon",
            message: `Your ${request.leaveType.name} ends and you're due back on ${returnDateStr}.`,
            relatedLeaveRequestId: request.id,
            actionUrl: leaveUrl,
          })
          .catch(() => undefined)

        await this.emailService
          .enqueue({
            templateKey: "leave_returning_tomorrow",
            recipientEmail: request.employee.email,
            recipientEmployeeId: request.employeeId,
            relatedModule: "leave",
            relatedEntityId: request.id,
            variables: {
              employee_name: employeeName,
              leave_type: request.leaveType.name,
              return_date: returnDateStr,
              leave_url: buildClientUrl(leaveUrl),
            },
          })
          .catch(() => undefined)

        const head = request.employee.position?.department.headOfDepartment
        if (head) {
          const managerUrl = "/staff/department-dashboard/leave"
          await this.notifications
            .create({
              recipientEmployeeId: head.employeeNumber,
              type: NotificationType.RETURNING_TOMORROW_MANAGER,
              title: "Team member returning from leave soon",
              message: `${employeeName} is due back from ${request.leaveType.name} on ${returnDateStr}.`,
              relatedLeaveRequestId: request.id,
              actionUrl: managerUrl,
            })
            .catch(() => undefined)

          await this.emailService
            .enqueue({
              templateKey: "leave_returning_tomorrow_manager",
              recipientEmail: head.email,
              recipientEmployeeId: head.employeeNumber,
              relatedModule: "leave",
              relatedEntityId: request.id,
              variables: {
                manager_name: `${head.firstName} ${head.lastName}`,
                employee_name: employeeName,
                leave_type: request.leaveType.name,
                return_date: returnDateStr,
                leave_url: buildClientUrl(managerUrl),
              },
            })
            .catch(() => undefined)
        }

        await this.prisma.leaveRequest
          .update({ where: { id: request.id }, data: { returningSoonNotifiedAt: new Date() } })
          .catch((error) => this.logger.error(`Failed to mark returning-soon reminder sent for ${request.id}: ${(error as Error).message}`))
      }
    } catch (error) {
      this.logger.error(`Leave returning-soon scan failed: ${(error as Error).message}`, (error as Error).stack)
    }
  }
}
