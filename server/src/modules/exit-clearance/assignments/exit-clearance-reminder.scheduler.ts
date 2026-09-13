import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { ExitClearanceAuditAction, ExitClearanceStatus, NotificationType } from "@prisma/client"

import { buildClientUrl } from "../../../common/client-url.util"
import { PrismaService } from "../../../prisma/prisma.service"
import { EmailService } from "../../email/email.service"
import { NotificationsService } from "../../leave/notifications/notifications.service"

const EMPLOYEE_PROGRESS_URL = "/staff/exit-clearance"
const REVIEWER_QUEUE_URL = "/staff/exit-clearance/reviews"

/**
 * Daily overdue sweep for the Exit Clearance Workflow — notifies whoever's
 * action is currently outstanding (the exiting employee, or the current
 * holder(s) of the form's responsible position) once a PENDING assignment
 * passes its dueDate. Modeled on ProbationReminderScheduler's
 * range+catch-up+dedup pattern: lastReminderSentAt gates re-firing so a
 * daily cron doesn't re-notify every single day an item stays overdue —
 * REMINDER_COOLDOWN_DAYS spaces reminders out instead.
 */
@Injectable()
export class ExitClearanceReminderScheduler {
  private readonly logger = new Logger(ExitClearanceReminderScheduler.name)

  private static readonly REMINDER_COOLDOWN_DAYS = 3

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService
  ) {}

  private async safeSendEmail(params: Parameters<EmailService["enqueue"]>[0]) {
    try {
      await this.emailService.enqueue(params)
    } catch {
      // EmailService.enqueue() already logs internally.
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async checkOverdue() {
    try {
      const now = new Date()
      const cooldownCutoff = new Date(now)
      cooldownCutoff.setDate(cooldownCutoff.getDate() - ExitClearanceReminderScheduler.REMINDER_COOLDOWN_DAYS)

      const overdue = await this.prisma.exitClearanceFormAssignment.findMany({
        where: {
          status: ExitClearanceStatus.PENDING,
          dueDate: { lt: now },
          OR: [{ lastReminderSentAt: null }, { lastReminderSentAt: { lt: cooldownCutoff } }],
        },
        include: {
          template: { include: { responsiblePosition: { select: { id: true, title: true } } } },
          employee: { select: { employeeNumber: true, firstName: true, lastName: true, email: true } },
        },
      })
      if (overdue.length === 0) return

      for (const assignment of overdue) {
        const employeeName = `${assignment.employee.firstName} ${assignment.employee.lastName}`
        const readyForReview = !assignment.template.requiresEmployeeCompletion || Boolean(assignment.employeeCompletedAt)

        if (!readyForReview) {
          await this.notificationsService
            .create({
              recipientEmployeeId: assignment.employeeId,
              type: NotificationType.EXIT_CLEARANCE_OVERDUE,
              title: "Exit clearance form overdue",
              message: `Your "${assignment.template.name}" form is overdue — please complete it as soon as possible.`,
              relatedEmployeeId: assignment.employeeId,
              actionUrl: EMPLOYEE_PROGRESS_URL,
            })
            .catch(() => undefined)
          await this.safeSendEmail({
            templateKey: "exit_clearance_overdue_reminder",
            recipientEmail: assignment.employee.email,
            recipientEmployeeId: assignment.employeeId,
            relatedModule: "exit",
            relatedEntityId: assignment.id,
            variables: {
              recipient_name: employeeName,
              item_name: assignment.template.name,
              clearance_url: buildClientUrl(EMPLOYEE_PROGRESS_URL),
            },
          })
        } else {
          const holders = await this.prisma.employee.findMany({
            where: { positionId: assignment.template.responsiblePosition.id, isActive: true, employmentStatus: "ACTIVE" },
            select: { employeeNumber: true, firstName: true, lastName: true, email: true },
          })
          if (holders.length > 0) {
            await this.notificationsService
              .createMany(
                holders.map((h) => h.employeeNumber),
                {
                  type: NotificationType.EXIT_CLEARANCE_OVERDUE,
                  title: "Exit clearance review overdue",
                  message: `${employeeName}'s "${assignment.template.name}" form is overdue for your review.`,
                  actionUrl: REVIEWER_QUEUE_URL,
                }
              )
              .catch(() => undefined)
            await Promise.all(
              holders.map((holder) =>
                this.safeSendEmail({
                  templateKey: "exit_clearance_overdue_reminder",
                  recipientEmail: holder.email,
                  recipientEmployeeId: holder.employeeNumber,
                  relatedModule: "exit",
                  relatedEntityId: assignment.id,
                  variables: {
                    recipient_name: `${holder.firstName} ${holder.lastName}`,
                    item_name: `${assignment.template.name} (${employeeName})`,
                    clearance_url: buildClientUrl(REVIEWER_QUEUE_URL),
                  },
                })
              )
            )
          }
        }

        await this.prisma.exitClearanceAuditLog.create({
          data: { assignmentId: assignment.id, action: ExitClearanceAuditAction.REMINDER_SENT, actorId: null },
        })
        await this.prisma.exitClearanceFormAssignment
          .update({ where: { id: assignment.id }, data: { lastReminderSentAt: now } })
          .catch((error) => this.logger.error(`Failed to mark reminder sent for ${assignment.id}: ${(error as Error).message}`))
      }
    } catch (error) {
      this.logger.error(`Exit clearance overdue scan failed: ${(error as Error).message}`, (error as Error).stack)
    }
  }
}
