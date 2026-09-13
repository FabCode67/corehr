import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { NotificationType } from "@prisma/client"

import { buildClientUrl } from "../../common/client-url.util"
import { PrismaService } from "../../prisma/prisma.service"
import { EmailService } from "../email/email.service"
import { NotificationsService } from "../leave/notifications/notifications.service"

const MANAGER_SELECT = { employeeNumber: true, firstName: true, lastName: true, email: true } as const

const HEAD_OF_DEPARTMENT_INCLUDE = {
  position: {
    select: {
      department: {
        select: {
          headOfDepartment: { select: MANAGER_SELECT },
          actingHeadOfDepartment: { select: MANAGER_SELECT },
        },
      },
    },
  },
} as const

type Manager = { employeeNumber: string; firstName: string; lastName: string; email: string }

/** Both the real Head of Department and its Acting Head (if one is
 *  currently assigned) get notified — see LeaveReminderScheduler's
 *  identical helper for the full reasoning (duplicated here rather than
 *  imported, same convention this app already uses for small
 *  cross-module-independent helpers like resolveLineManagerId). */
function getManagerRecipients(department: { headOfDepartment: Manager | null; actingHeadOfDepartment: Manager | null }): Manager[] {
  const candidates = [department.headOfDepartment, department.actingHeadOfDepartment].filter((m): m is Manager => m !== null)
  const seen = new Set<string>()
  return candidates.filter((manager) => (seen.has(manager.employeeNumber) ? false : (seen.add(manager.employeeNumber), true)))
}

/**
 * Fires BIRTHDAY_TOMORROW / WORK_ANNIVERSARY_TOMORROW to the resolved Head
 * of Department AND Acting Head of Department (if one is assigned — see
 * getManagerRecipients()) of each active employee whose birthday
 * (Employee.dateOfBirth) or work anniversary (Employee.employmentStartDate)
 * falls tomorrow — manager-facing only, per the Head of Department
 * follow-up request ("notification about employee who is going to have a
 * birthday 1 day before or ... a joining day"). Deliberately not
 * employee-facing: the request specifically asked for the department head
 * to be told about their own people's milestones, not for a self-facing
 * reminder (unlike LeaveReminderScheduler's employee+manager pair).
 *
 * When a department has a head and/or acting head,
 * NotificationsService.createMany()'s own "copy every notification to
 * every active HR Administrator" behavior already means the Head of Human
 * Resource (or any other admin) sees this too, for free — no separate
 * admin-facing branch needed there. But when a department has NEITHER a
 * head NOR an acting head assigned, the original version of this scheduler
 * fired nothing at all, so an admin reviewing "everyone's" milestones — the
 * Head of HR's whole reason for wanting this — would silently miss anyone
 * in a headless department. Fixed below: departments with no head (real or
 * acting) fall back to notifications.createForAllAdmins() directly, so
 * bank-wide coverage for admins doesn't depend on every department having
 * a head set.
 *
 * A birthday/anniversary is an annual recurrence, not a single stored date
 * to range-match — unlike every other reminder scheduler in this app,
 * there's no clean way to express "month/day matches tomorrow" across
 * arbitrary years as a single Prisma date-range WHERE clause without raw
 * SQL. Instead this fetches every active employee and computes each one's
 * next occurrence in JS. An acceptable daily cost for a single bank's
 * headcount; revisit with a raw query if that ever becomes a real scale
 * concern.
 */
@Injectable()
export class EmployeeMilestonesScheduler {
  private readonly logger = new Logger(EmployeeMilestonesScheduler.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly emailService: EmailService
  ) {}

  /** How many days ahead still counts as "catch up" if a cron run is
   *  missed — the dedup field is keyed by the occurrence's year, so this
   *  only prevents a multi-day outage from silently skipping the reminder
   *  for the whole year, not a re-notify of the same occurrence. */
  private static readonly CATCH_UP_DAYS = 3

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async checkBirthdaysTomorrow() {
    try {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)

      const employees = await this.prisma.employee.findMany({
        where: { isActive: true },
        select: {
          employeeNumber: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          lastBirthdayNotifiedYear: true,
          ...HEAD_OF_DEPARTMENT_INCLUDE,
        },
      })
      if (employees.length === 0) return

      // Only needed for the "no department head" fallback branch below, but
      // cheap enough to fetch once up front rather than re-querying inside
      // the loop for every headless-department employee.
      const admins = await this.prisma.employee.findMany({
        where: { isAdmin: true, isActive: true },
        select: { employeeNumber: true, email: true, firstName: true, lastName: true },
      })

      for (const employee of employees) {
        const nextOccurrence = this.nextOccurrence(employee.dateOfBirth, today)
        const daysUntil = this.daysBetween(today, nextOccurrence)
        if (daysUntil < 1 || daysUntil > EmployeeMilestonesScheduler.CATCH_UP_DAYS) continue

        const occurrenceYear = nextOccurrence.getUTCFullYear()
        if (employee.lastBirthdayNotifiedYear === occurrenceYear) continue

        const employeeName = `${employee.firstName} ${employee.lastName}`
        const dateStr = nextOccurrence.toISOString().slice(0, 10)
        const url = "/staff/department-dashboard"
        const managers = employee.position ? getManagerRecipients(employee.position.department) : []

        if (managers.length > 0) {
          await this.notifications
            .createMany(
              managers.map((manager) => manager.employeeNumber),
              {
                type: NotificationType.BIRTHDAY_TOMORROW,
                title: "Team member's birthday is tomorrow",
                message: `${employeeName}'s birthday is tomorrow (${dateStr}).`,
                relatedEmployeeId: employee.employeeNumber,
                actionUrl: url,
              }
            )
            .catch(() => undefined)

          for (const manager of managers) {
            await this.emailService
              .enqueue({
                templateKey: "birthday_tomorrow",
                recipientEmail: manager.email,
                recipientEmployeeId: manager.employeeNumber,
                relatedModule: "employees",
                relatedEntityId: employee.employeeNumber,
                variables: {
                  manager_name: `${manager.firstName} ${manager.lastName}`,
                  employee_name: employeeName,
                  date: dateStr,
                  employee_url: buildClientUrl(url),
                },
              })
              .catch(() => undefined)
          }
        } else {
          // No department head set — fall back to notifying every HR admin
          // directly (createForAllAdmins, not create(), since there's no
          // single head to fan out from) so bank-wide coverage for the Head
          // of Human Resource doesn't depend on every department having a
          // head assigned.
          await this.notifications
            .createForAllAdmins({
              type: NotificationType.BIRTHDAY_TOMORROW,
              title: "Team member's birthday is tomorrow",
              message: `${employeeName}'s birthday is tomorrow (${dateStr}).`,
              relatedEmployeeId: employee.employeeNumber,
              actionUrl: url,
            })
            .catch(() => undefined)

          for (const admin of admins) {
            await this.emailService
              .enqueue({
                templateKey: "birthday_tomorrow",
                recipientEmail: admin.email,
                recipientEmployeeId: admin.employeeNumber,
                relatedModule: "employees",
                relatedEntityId: employee.employeeNumber,
                variables: {
                  manager_name: `${admin.firstName} ${admin.lastName}`,
                  employee_name: employeeName,
                  date: dateStr,
                  employee_url: buildClientUrl(url),
                },
              })
              .catch(() => undefined)
          }
        }

        await this.prisma.employee
          .update({ where: { employeeNumber: employee.employeeNumber }, data: { lastBirthdayNotifiedYear: occurrenceYear } })
          .catch((error) => this.logger.error(`Failed to mark birthday reminder sent for ${employee.employeeNumber}: ${(error as Error).message}`))
      }
    } catch (error) {
      this.logger.error(`Birthday-tomorrow scan failed: ${(error as Error).message}`, (error as Error).stack)
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async checkAnniversariesTomorrow() {
    try {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)

      const employees = await this.prisma.employee.findMany({
        where: { isActive: true, employmentStartDate: { not: null } },
        select: {
          employeeNumber: true,
          firstName: true,
          lastName: true,
          employmentStartDate: true,
          lastAnniversaryNotifiedYear: true,
          ...HEAD_OF_DEPARTMENT_INCLUDE,
        },
      })
      if (employees.length === 0) return

      // Only needed for the "no department head" fallback branch below —
      // see checkBirthdaysTomorrow()'s identical comment.
      const admins = await this.prisma.employee.findMany({
        where: { isAdmin: true, isActive: true },
        select: { employeeNumber: true, email: true, firstName: true, lastName: true },
      })

      for (const employee of employees) {
        const startDate = employee.employmentStartDate!
        const nextOccurrence = this.nextOccurrence(startDate, today)
        const daysUntil = this.daysBetween(today, nextOccurrence)
        if (daysUntil < 1 || daysUntil > EmployeeMilestonesScheduler.CATCH_UP_DAYS) continue

        const occurrenceYear = nextOccurrence.getUTCFullYear()
        if (employee.lastAnniversaryNotifiedYear === occurrenceYear) continue

        const employeeName = `${employee.firstName} ${employee.lastName}`
        const dateStr = nextOccurrence.toISOString().slice(0, 10)
        const years = occurrenceYear - startDate.getUTCFullYear()
        const url = "/staff/department-dashboard"
        const managers = employee.position ? getManagerRecipients(employee.position.department) : []

        if (managers.length > 0) {
          await this.notifications
            .createMany(
              managers.map((manager) => manager.employeeNumber),
              {
                type: NotificationType.WORK_ANNIVERSARY_TOMORROW,
                title: "Team member's work anniversary is tomorrow",
                message: `${employeeName}'s work anniversary is tomorrow (${dateStr}) — ${years} year(s) at NCBA Rwanda.`,
                relatedEmployeeId: employee.employeeNumber,
                actionUrl: url,
              }
            )
            .catch(() => undefined)

          for (const manager of managers) {
            await this.emailService
              .enqueue({
                templateKey: "work_anniversary_tomorrow",
                recipientEmail: manager.email,
                recipientEmployeeId: manager.employeeNumber,
                relatedModule: "employees",
                relatedEntityId: employee.employeeNumber,
                variables: {
                  manager_name: `${manager.firstName} ${manager.lastName}`,
                  employee_name: employeeName,
                  date: dateStr,
                  years: String(years),
                  employee_url: buildClientUrl(url),
                },
              })
              .catch(() => undefined)
          }
        } else {
          // No department head set — same admin-wide fallback as
          // checkBirthdaysTomorrow().
          await this.notifications
            .createForAllAdmins({
              type: NotificationType.WORK_ANNIVERSARY_TOMORROW,
              title: "Team member's work anniversary is tomorrow",
              message: `${employeeName}'s work anniversary is tomorrow (${dateStr}) — ${years} year(s) at NCBA Rwanda.`,
              relatedEmployeeId: employee.employeeNumber,
              actionUrl: url,
            })
            .catch(() => undefined)

          for (const admin of admins) {
            await this.emailService
              .enqueue({
                templateKey: "work_anniversary_tomorrow",
                recipientEmail: admin.email,
                recipientEmployeeId: admin.employeeNumber,
                relatedModule: "employees",
                relatedEntityId: employee.employeeNumber,
                variables: {
                  manager_name: `${admin.firstName} ${admin.lastName}`,
                  employee_name: employeeName,
                  date: dateStr,
                  years: String(years),
                  employee_url: buildClientUrl(url),
                },
              })
              .catch(() => undefined)
          }
        }

        await this.prisma.employee
          .update({ where: { employeeNumber: employee.employeeNumber }, data: { lastAnniversaryNotifiedYear: occurrenceYear } })
          .catch((error) => this.logger.error(`Failed to mark anniversary reminder sent for ${employee.employeeNumber}: ${(error as Error).message}`))
      }
    } catch (error) {
      this.logger.error(`Work-anniversary-tomorrow scan failed: ${(error as Error).message}`, (error as Error).stack)
    }
  }

  /** Next calendar occurrence of sourceDate's month/day at or after
   *  `today` — this year's if it hasn't passed yet, else next year's. A
   *  Feb 29 source date falls back to Mar 1 in non-leap years (JS Date's
   *  own day-overflow behavior handles this automatically). */
  private nextOccurrence(sourceDate: Date, today: Date): Date {
    const month = sourceDate.getUTCMonth()
    const day = sourceDate.getUTCDate()
    let occurrence = new Date(Date.UTC(today.getUTCFullYear(), month, day))
    if (occurrence.getTime() < today.getTime()) {
      occurrence = new Date(Date.UTC(today.getUTCFullYear() + 1, month, day))
    }
    return occurrence
  }

  private daysBetween(from: Date, to: Date): number {
    return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
  }
}
