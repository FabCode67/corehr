import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { CourseAssignmentStatus } from "@prisma/client"

import { buildClientUrl } from "../../../common/client-url.util"
import { PrismaService } from "../../../prisma/prisma.service"
import { EmailService } from "../../email/email.service"

const TERMINAL_STATUSES: CourseAssignmentStatus[] = ["VERIFIED", "CLOSED"]
const NOT_STARTED_AFTER_DAYS = 3
const APPROACHING_DEADLINE_DAYS = 3

/**
 * The three time-based Learning & Development reminders from the Email
 * Notification & Automation spec (course assignment itself is sent
 * immediately from AssignmentsService.create()/assignAutoHireCourses(),
 * not from here). Same daily-scan, fire-on-exact-day-match approach as
 * PerformanceReminderScheduler — see that file's doc comment for the
 * dedup trade-off this shares.
 */
@Injectable()
export class LearningReminderScheduler {
  private readonly logger = new Logger(LearningReminderScheduler.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async sendReminders() {
    try {
      const open = await this.prisma.courseAssignment.findMany({
        where: { status: { notIn: TERMINAL_STATUSES } },
        include: {
          course: { select: { name: true } },
          employee: { select: { employeeNumber: true, email: true, firstName: true, lastName: true } },
        },
      })

      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)

      for (const assignment of open) {
        const daysSinceAssigned = Math.round((today.getTime() - assignment.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        const daysUntilDue = assignment.dueDate
          ? Math.round((new Date(assignment.dueDate).setUTCHours(0, 0, 0, 0) - today.getTime()) / (1000 * 60 * 60 * 24))
          : null

        let templateKey: string | null = null
        if (assignment.status === "ASSIGNED" && daysSinceAssigned === NOT_STARTED_AFTER_DAYS) {
          templateKey = "learning_not_started_reminder"
        } else if (daysUntilDue === APPROACHING_DEADLINE_DAYS) {
          templateKey = "learning_approaching_deadline"
        } else if (daysUntilDue === -1) {
          templateKey = "learning_overdue"
        }
        if (!templateKey) continue

        await this.emailService
          .enqueue({
            templateKey,
            recipientEmail: assignment.employee.email,
            recipientEmployeeId: assignment.employee.employeeNumber,
            relatedModule: "learning",
            relatedEntityId: assignment.id,
            variables: {
              employee_name: `${assignment.employee.firstName} ${assignment.employee.lastName}`,
              course_name: assignment.course.name,
              due_date: assignment.dueDate ? assignment.dueDate.toISOString().slice(0, 10) : "No due date set",
              course_url: buildClientUrl(`/staff/learning/${assignment.id}`),
            },
          })
          .catch(() => undefined)
      }
    } catch (error) {
      this.logger.error(`Learning reminder scan failed: ${(error as Error).message}`, (error as Error).stack)
    }
  }
}
