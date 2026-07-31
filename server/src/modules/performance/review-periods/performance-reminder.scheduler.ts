import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { PerformanceReviewType } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"
import { EmailService } from "../../email/email.service"

const SUBMITTED_STATUSES = ["SUBMITTED", "ACKNOWLEDGED", "FINALIZED"] as const

/**
 * The 14/7/1-day-before and overdue self-appraisal reminders from the
 * Email Notification & Automation spec. Runs once a day (there's no
 * concept of "time of day" precision needed for a day-granularity
 * reminder) and compares each OPEN cycle's HR-set deadline
 * (midYearDeadline/annualDeadline — see the schema doc comment) against
 * today.
 *
 * Dedup strategy: each of the 4 reminder types fires on exactly one
 * calendar day relative to the deadline (daysUntil === 14, 7, 1, or the
 * single day daysUntil === -1 for "just went overdue"), so a normal daily
 * run naturally sends each one once. The trade-off, worth calling out
 * explicitly: if this job doesn't run on the exact day a threshold is hit
 * (deploy downtime, etc.), that specific reminder is silently skipped
 * rather than sent late — accepted here to avoid needing a separate
 * "have we already sent this" tracking table on top of EmailLog.
 *
 * A review counts as "done" for reminder purposes once its
 * PerformanceReview row exists with status SUBMITTED/ACKNOWLEDGED/
 * FINALIZED — DRAFT (or no row at all, since rows are created lazily on
 * first save) both mean "still needs a nudge".
 */
@Injectable()
export class PerformanceReminderScheduler {
  private readonly logger = new Logger(PerformanceReminderScheduler.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async sendReminders() {
    try {
      const periods = await this.prisma.performanceReviewPeriod.findMany({
        where: { OR: [{ midYearStatus: "OPEN" }, { annualStatus: "OPEN" }] },
      })

      for (const period of periods) {
        if (period.midYearStatus === "OPEN" && period.midYearDeadline) {
          await this.remindForCycle(period.id, period.name, "MID_YEAR", period.midYearDeadline)
        }
        if (period.annualStatus === "OPEN" && period.annualDeadline) {
          await this.remindForCycle(period.id, period.name, "ANNUAL", period.annualDeadline)
        }
      }
    } catch (error) {
      this.logger.error(`Performance reminder scan failed: ${(error as Error).message}`, (error as Error).stack)
    }
  }

  private async remindForCycle(periodId: string, periodName: string, cycle: PerformanceReviewType, deadline: Date) {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const deadlineDay = new Date(deadline)
    deadlineDay.setUTCHours(0, 0, 0, 0)
    const daysUntil = Math.round((deadlineDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    const templateKey =
      daysUntil === 14
        ? "performance_reminder_14_days"
        : daysUntil === 7
          ? "performance_reminder_7_days"
          : daysUntil === 1
            ? "performance_reminder_1_day"
            : daysUntil === -1
              ? "performance_overdue"
              : null
    if (!templateKey) return

    const submitted = await this.prisma.performanceReview.findMany({
      where: { periodId, reviewType: cycle, status: { in: [...SUBMITTED_STATUSES] } },
      select: { employeeId: true },
    })
    const submittedIds = new Set(submitted.map((r) => r.employeeId))

    const employees = await this.prisma.employee.findMany({
      where: { isActive: true, employeeNumber: { notIn: [...submittedIds] } },
      select: { employeeNumber: true, email: true, firstName: true, lastName: true },
    })

    const reviewPeriodLabel = `${periodName} ${cycle === "MID_YEAR" ? "Mid-Year" : "Annual"}`
    const deadlineLabel = deadline.toISOString().slice(0, 10)

    await Promise.all(
      employees.map((employee) =>
        this.emailService
          .enqueue({
            templateKey,
            recipientEmail: employee.email,
            recipientEmployeeId: employee.employeeNumber,
            relatedModule: "performance",
            relatedEntityId: `${periodId}:${cycle}`,
            variables: {
              employee_name: `${employee.firstName} ${employee.lastName}`,
              review_period: reviewPeriodLabel,
              deadline: deadlineLabel,
            },
          })
          .catch(() => undefined)
      )
    )

    this.logger.log(`Sent ${templateKey} to ${employees.length} employee(s) for ${reviewPeriodLabel}.`)
  }
}
