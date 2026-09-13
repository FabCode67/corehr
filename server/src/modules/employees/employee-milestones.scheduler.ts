import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { NotificationType } from "@prisma/client"

import { buildClientUrl } from "../../common/client-url.util"
import { PrismaService } from "../../prisma/prisma.service"
import { EmailService } from "../email/email.service"
import { NotificationsService } from "../leave/notifications/notifications.service"

const HEAD_OF_DEPARTMENT_INCLUDE = {
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
 * Fires BIRTHDAY_TOMORROW / WORK_ANNIVERSARY_TOMORROW to the resolved Head
 * of Department of each active employee whose birthday (Employee.dateOfBirth)
 * or work anniversary (Employee.employmentStartDate) falls tomorrow —
 * manager-facing only, per the Head of Department follow-up request
 * ("notification about employee who is going to have a birthday 1 day
 * before or ... a joining day"). Deliberately not employee-facing: the
 * request specifically asked for the department head to be told about
 * their own people's milestones, not for a self-facing reminder (unlike
 * LeaveReminderScheduler's employee+manager pair).
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

      for (const employee of employees) {
        const nextOccurrence = this.nextOccurrence(employee.dateOfBirth, today)
        const daysUntil = this.daysBetween(today, nextOccurrence)
        if (daysUntil < 1 || daysUntil > EmployeeMilestonesScheduler.CATCH_UP_DAYS) continue

        const occurrenceYear = nextOccurrence.getUTCFullYear()
        if (employee.lastBirthdayNotifiedYear === occurrenceYear) continue

        const head = employee.position?.department.headOfDepartment
        if (head) {
          const employeeName = `${employee.firstName} ${employee.lastName}`
          const dateStr = nextOccurrence.toISOString().slice(0, 10)
          const url = "/staff/department-dashboard"

          await this.notifications
            .create({
              recipientEmployeeId: head.employeeNumber,
              type: NotificationType.BIRTHDAY_TOMORROW,
              title: "Team member's birthday is tomorrow",
              message: `${employeeName}'s birthday is tomorrow (${dateStr}).`,
              relatedEmployeeId: employee.employeeNumber,
              actionUrl: url,
            })
            .catch(() => undefined)

          await this.emailService
            .enqueue({
              templateKey: "birthday_tomorrow",
              recipientEmail: head.email,
              recipientEmployeeId: head.employeeNumber,
              relatedModule: "employees",
              relatedEntityId: employee.employeeNumber,
              variables: {
                manager_name: `${head.firstName} ${head.lastName}`,
                employee_name: employeeName,
                date: dateStr,
                employee_url: buildClientUrl(url),
              },
            })
            .catch(() => undefined)
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

      for (const employee of employees) {
        const startDate = employee.employmentStartDate!
        const nextOccurrence = this.nextOccurrence(startDate, today)
        const daysUntil = this.daysBetween(today, nextOccurrence)
        if (daysUntil < 1 || daysUntil > EmployeeMilestonesScheduler.CATCH_UP_DAYS) continue

        const occurrenceYear = nextOccurrence.getUTCFullYear()
        if (employee.lastAnniversaryNotifiedYear === occurrenceYear) continue

        const head = employee.position?.department.headOfDepartment
        if (head) {
          const employeeName = `${employee.firstName} ${employee.lastName}`
          const dateStr = nextOccurrence.toISOString().slice(0, 10)
          const years = occurrenceYear - startDate.getUTCFullYear()
          const url = "/staff/department-dashboard"

          await this.notifications
            .create({
              recipientEmployeeId: head.employeeNumber,
              type: NotificationType.WORK_ANNIVERSARY_TOMORROW,
              title: "Team member's work anniversary is tomorrow",
              message: `${employeeName}'s work anniversary is tomorrow (${dateStr}) — ${years} year(s) at NCBA Rwanda.`,
              relatedEmployeeId: employee.employeeNumber,
              actionUrl: url,
            })
            .catch(() => undefined)

          await this.emailService
            .enqueue({
              templateKey: "work_anniversary_tomorrow",
              recipientEmail: head.email,
              recipientEmployeeId: head.employeeNumber,
              relatedModule: "employees",
              relatedEntityId: employee.employeeNumber,
              variables: {
                manager_name: `${head.firstName} ${head.lastName}`,
                employee_name: employeeName,
                date: dateStr,
                years: String(years),
                employee_url: buildClientUrl(url),
              },
            })
            .catch(() => undefined)
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
