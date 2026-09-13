import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common"

import { ExitClearanceAuditAction, ExitClearanceStatus, NotificationType, Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"
import { NotificationsService } from "../../leave/notifications/notifications.service"
import { EmailService } from "../../email/email.service"
import { buildClientUrl } from "../../../common/client-url.util"

import { ClearanceReviewDecision, ReviewClearanceFormDto } from "./dto/review-clearance-form.dto"

const EMPLOYEE_REF = { select: { employeeNumber: true, firstName: true, lastName: true, email: true } } as const

const ASSIGNMENT_INCLUDE = {
  template: { include: { responsibleDepartment: { select: { id: true, name: true } }, responsiblePosition: { select: { id: true, title: true } } } },
  employee: EMPLOYEE_REF,
  assignedBy: EMPLOYEE_REF,
  employeeCompletedBy: EMPLOYEE_REF,
  confirmedBy: EMPLOYEE_REF,
  signedBy: EMPLOYEE_REF,
} as const

const EMPLOYEE_PROGRESS_URL = "/staff/exit-clearance"
const REVIEWER_QUEUE_URL = "/staff/exit-clearance/reviews"

/**
 * Core Exit Clearance Workflow engine — see schema.prisma's "EXIT CLEARANCE
 * WORKFLOW" module doc comment for the full design (status rollup rules,
 * why confirm/sign are one reviewer action, position-based routing).
 */
@Injectable()
export class ExitClearanceService {
  private readonly logger = new Logger(ExitClearanceService.name)

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

  private async isHr(employeeId: string): Promise<boolean> {
    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: employeeId }, select: { isAdmin: true } })
    return actor?.isAdmin ?? false
  }

  /** "Any current employee occupying that position" — resolved live, never
   *  stored, so turnover in the responsible seat never orphans in-flight
   *  assignments. Realistically zero or one person, but nothing in the org
   *  structure enforces that, so this returns every match. */
  private resolvePositionHolders(positionId: string) {
    return this.prisma.employee.findMany({
      where: { positionId, isActive: true, employmentStatus: "ACTIVE" },
      select: { employeeNumber: true, firstName: true, lastName: true, email: true },
    })
  }

  private async isCurrentHolder(employeeId: string, positionId: string): Promise<boolean> {
    const employee = await this.prisma.employee.findUnique({ where: { employeeNumber: employeeId }, select: { positionId: true } })
    return employee?.positionId === positionId
  }

  /** The single source of truth for "is this assignment done" — every
   *  mutation recomputes status from these three flags/timestamps rather
   *  than setting status directly, so there's exactly one place that can
   *  get the rollup wrong. */
  private computeStatus(
    template: { requiresEmployeeCompletion: boolean; requiresConfirmation: boolean; requiresSignature: boolean },
    fields: { employeeCompletedAt: Date | null; confirmedAt: Date | null; signedAt: Date | null }
  ): ExitClearanceStatus {
    if (template.requiresEmployeeCompletion && !fields.employeeCompletedAt) return ExitClearanceStatus.PENDING
    if (template.requiresConfirmation && !fields.confirmedAt) return ExitClearanceStatus.PENDING
    if (template.requiresSignature && !fields.signedAt) return ExitClearanceStatus.PENDING
    return ExitClearanceStatus.COMPLETED
  }

  /** Whether an assignment is ready for its reviewer right now — either the
   *  template doesn't gate on employee completion at all, or the employee
   *  has already done their part. Drives both the "review needed" notify
   *  timing and the reviewer queue's PENDING filter. */
  private isReadyForReview(template: { requiresEmployeeCompletion: boolean }, employeeCompletedAt: Date | null) {
    return !template.requiresEmployeeCompletion || Boolean(employeeCompletedAt)
  }

  private async log(assignmentId: string, action: ExitClearanceAuditAction, actorId: string | null, comment?: string | null, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma
    await client.exitClearanceAuditLog.create({ data: { assignmentId, action, actorId, comment: comment ?? null } })
  }

  private async findAssignmentOrThrow(id: string) {
    const assignment = await this.prisma.exitClearanceFormAssignment.findUnique({ where: { id }, include: ASSIGNMENT_INCLUDE })
    if (!assignment) {
      throw new NotFoundException(`Exit clearance form assignment ${id} not found`)
    }
    return assignment
  }

  findForEmployee(employeeId: string) {
    return this.prisma.exitClearanceFormAssignment.findMany({
      where: { employeeId },
      include: ASSIGNMENT_INCLUDE,
      orderBy: [{ template: { sortOrder: "asc" } }, { template: { name: "asc" } }],
    })
  }

  async getProgressForEmployee(employeeId: string) {
    const assignments = await this.findForEmployee(employeeId)
    const now = new Date()

    const isOverdue = (a: (typeof assignments)[number]) => a.status === ExitClearanceStatus.PENDING && a.dueDate < now

    const total = assignments.length
    const completed = assignments.filter((a) => a.status === ExitClearanceStatus.COMPLETED).length
    const rejected = assignments.filter((a) => a.status === ExitClearanceStatus.REJECTED).length
    const overdue = assignments.filter(isOverdue).length
    const pending = assignments.filter((a) => a.status === ExitClearanceStatus.PENDING && !isOverdue(a)).length

    const mandatoryOutstanding = assignments
      .filter((a) => a.template.isMandatory && a.status !== ExitClearanceStatus.COMPLETED)
      .map((a) => ({ id: a.id, name: a.template.name, status: a.status }))

    return {
      total,
      completed,
      pending,
      rejected,
      overdue,
      allMandatoryCompleted: mandatoryOutstanding.length === 0,
      mandatoryOutstanding,
      assignments: assignments.map((a) => ({ ...a, isOverdue: isOverdue(a) })),
    }
  }

  /** Forms currently awaiting action from whichever position(s) this
   *  employee holds — both "waiting on the employee" and "ready for my
   *  review" rows are returned (readyForReview distinguishes them) so the
   *  reviewer can see what's coming, not just what's actionable today. */
  async getReviewerQueue(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { employeeNumber: employeeId }, select: { positionId: true } })
    if (!employee?.positionId) return []

    const assignments = await this.prisma.exitClearanceFormAssignment.findMany({
      where: { status: ExitClearanceStatus.PENDING, template: { responsiblePositionId: employee.positionId } },
      include: ASSIGNMENT_INCLUDE,
      orderBy: { dueDate: "asc" },
    })

    const now = new Date()
    return assignments.map((a) => ({
      ...a,
      isOverdue: a.dueDate < now,
      readyForReview: this.isReadyForReview(a.template, a.employeeCompletedAt),
    }))
  }

  /** Bank-wide rollup for the HR dashboard — every clearance form currently
   *  tracked, grouped by status, plus a per-employee breakdown so HR can see
   *  which exits are blocked and on what. */
  async getHrDashboard() {
    const assignments = await this.prisma.exitClearanceFormAssignment.findMany({
      where: { employee: { employmentStatus: "ACTIVE" } },
      include: ASSIGNMENT_INCLUDE,
      orderBy: { dueDate: "asc" },
    })

    const now = new Date()
    const isOverdue = (a: (typeof assignments)[number]) => a.status === ExitClearanceStatus.PENDING && a.dueDate < now

    const counts = {
      completed: assignments.filter((a) => a.status === ExitClearanceStatus.COMPLETED).length,
      pending: assignments.filter((a) => a.status === ExitClearanceStatus.PENDING && !isOverdue(a)).length,
      rejected: assignments.filter((a) => a.status === ExitClearanceStatus.REJECTED).length,
      overdue: assignments.filter(isOverdue).length,
    }

    const byEmployee = new Map<string, { employee: (typeof assignments)[number]["employee"]; total: number; completed: number; pending: number; rejected: number; overdue: number }>()
    for (const a of assignments) {
      if (!byEmployee.has(a.employeeId)) {
        byEmployee.set(a.employeeId, { employee: a.employee, total: 0, completed: 0, pending: 0, rejected: 0, overdue: 0 })
      }
      const bucket = byEmployee.get(a.employeeId)!
      bucket.total += 1
      if (a.status === ExitClearanceStatus.COMPLETED) bucket.completed += 1
      else if (a.status === ExitClearanceStatus.REJECTED) bucket.rejected += 1
      else if (isOverdue(a)) bucket.overdue += 1
      else bucket.pending += 1
    }

    return {
      counts,
      employees: Array.from(byEmployee.values()).sort((a, b) => b.overdue - a.overdue || b.rejected - a.rejected),
      assignments: assignments.map((a) => ({ ...a, isOverdue: isOverdue(a) })),
    }
  }

  /**
   * Assigns every active template to an employee starting the exit process
   * — called by ExitProcessService.initiateExit(). Idempotent per
   * (employee, template) via upsert, resetting a re-assigned row back to a
   * fresh PENDING state, same "rehired-then-re-exited gets a clean slate"
   * precedent as the checklist this replaces.
   */
  async bulkAssignForExit(employeeId: string, actingEmployeeId: string) {
    const templates = await this.prisma.exitClearanceFormTemplate.findMany({
      where: { isActive: true },
      include: { responsiblePosition: { select: { id: true, title: true } } },
    })
    if (templates.length === 0) {
      this.logger.warn(`Exit clearance requested for ${employeeId}, but no active clearance form templates exist — nothing assigned. Configure some from Exit Clearance Templates.`)
      return []
    }

    const employee = await this.prisma.employee.findUniqueOrThrow({ where: { employeeNumber: employeeId }, select: { employeeNumber: true, firstName: true, lastName: true, email: true } })
    const assignments = []

    for (const template of templates) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + template.daysToComplete)

      const assignment = await this.prisma.exitClearanceFormAssignment.upsert({
        where: { employeeId_templateId: { employeeId, templateId: template.id } },
        update: {
          status: ExitClearanceStatus.PENDING,
          dueDate,
          employeeCompletedAt: null,
          employeeCompletedById: null,
          confirmedAt: null,
          confirmedById: null,
          signedAt: null,
          signedById: null,
          lastActionComment: null,
          lastReminderSentAt: null,
          assignedById: actingEmployeeId,
          assignedAt: new Date(),
        },
        create: { employeeId, templateId: template.id, dueDate, assignedById: actingEmployeeId },
        include: ASSIGNMENT_INCLUDE,
      })
      await this.log(assignment.id, ExitClearanceAuditAction.ASSIGNED, actingEmployeeId)
      assignments.push(assignment)

      // Forms that don't gate on the employee at all are reviewable right
      // away — notify the reviewer now rather than waiting on an employee
      // action that was never required.
      if (this.isReadyForReview(template, null)) {
        await this.notifyReviewers(template.responsiblePosition.id, employee, template.name, assignment.id)
      }
    }

    await this.notificationsService.create({
      recipientEmployeeId: employeeId,
      type: NotificationType.EXIT_CLEARANCE_ASSIGNED,
      title: "Exit clearance forms assigned",
      message: `${assignments.length} exit clearance form${assignments.length === 1 ? "" : "s"} ${assignments.length === 1 ? "has" : "have"} been assigned to you as part of your exit process.`,
      relatedEmployeeId: employeeId,
      actionUrl: EMPLOYEE_PROGRESS_URL,
    })
    await this.safeSendEmail({
      templateKey: "exit_clearance_checklist",
      recipientEmail: employee.email,
      recipientEmployeeId: employeeId,
      relatedModule: "exit",
      relatedEntityId: employeeId,
      variables: { employee_name: `${employee.firstName} ${employee.lastName}`, last_working_day: "To be confirmed by HR" },
    })

    return assignments
  }

  private async notifyReviewers(positionId: string, employee: { firstName: string; lastName: string }, templateName: string, assignmentId: string) {
    const holders = await this.resolvePositionHolders(positionId)
    if (holders.length === 0) return

    await this.notificationsService.createMany(
      holders.map((h) => h.employeeNumber),
      {
        type: NotificationType.EXIT_CLEARANCE_REVIEW_NEEDED,
        title: "Exit clearance form needs your review",
        message: `${employee.firstName} ${employee.lastName}'s "${templateName}" form is ready for your review.`,
        actionUrl: REVIEWER_QUEUE_URL,
      }
    )
    await Promise.all(
      holders.map((holder) =>
        this.safeSendEmail({
          templateKey: "exit_manager_approval_task",
          recipientEmail: holder.email,
          recipientEmployeeId: holder.employeeNumber,
          relatedModule: "exit",
          relatedEntityId: assignmentId,
          variables: {
            manager_name: `${holder.firstName} ${holder.lastName}`,
            employee_name: `${employee.firstName} ${employee.lastName}`,
            task_name: templateName,
            employee_url: buildClientUrl(REVIEWER_QUEUE_URL),
          },
        })
      )
    )
  }

  /** The exiting employee marks their own part of a form done — e.g. "I
   *  have returned my laptop". Re-submitting after a RETURN goes through
   *  this same path. */
  async employeeComplete(assignmentId: string, employeeId: string) {
    const assignment = await this.findAssignmentOrThrow(assignmentId)
    if (assignment.employeeId !== employeeId) {
      throw new ForbiddenException("You can only complete your own exit clearance forms.")
    }
    if (!assignment.template.requiresEmployeeCompletion) {
      throw new BadRequestException("This form does not require any action from you.")
    }
    if (assignment.status === ExitClearanceStatus.COMPLETED) {
      throw new BadRequestException("This form has already been completed.")
    }

    const employeeCompletedAt = new Date()
    const status = this.computeStatus(assignment.template, { employeeCompletedAt, confirmedAt: assignment.confirmedAt, signedAt: assignment.signedAt })

    const updated = await this.prisma.exitClearanceFormAssignment.update({
      where: { id: assignmentId },
      data: { employeeCompletedAt, employeeCompletedById: employeeId, status },
      include: ASSIGNMENT_INCLUDE,
    })
    await this.log(assignmentId, ExitClearanceAuditAction.EMPLOYEE_COMPLETED, employeeId)

    if (status === ExitClearanceStatus.PENDING) {
      await this.notifyReviewers(assignment.template.responsiblePosition.id, updated.employee, updated.template.name, assignmentId)
    }

    return updated
  }

  /** Reviewer action — either the current holder of the form's responsible
   *  position, or HR (isAdmin) as an override for a vacant/transitioning
   *  seat. APPROVE sets confirmedAt/signedAt for whichever the template
   *  requires and always lands on COMPLETED (the employee-side requirement,
   *  if any, is already satisfied by the time this is callable — see the
   *  precondition check below). RETURN sends the form back to the employee
   *  with a required comment. */
  async review(assignmentId: string, dto: ReviewClearanceFormDto) {
    const assignment = await this.findAssignmentOrThrow(assignmentId)

    const authorized = (await this.isCurrentHolder(dto.reviewerId, assignment.template.responsiblePosition.id)) || (await this.isHr(dto.reviewerId))
    if (!authorized) {
      throw new ForbiddenException(`Only the current ${assignment.template.responsiblePosition.title} (or HR) can review this form.`)
    }
    if (assignment.status === ExitClearanceStatus.COMPLETED) {
      throw new BadRequestException("This form has already been completed.")
    }
    if (!this.isReadyForReview(assignment.template, assignment.employeeCompletedAt)) {
      throw new BadRequestException("This form is still waiting on the employee to complete their part.")
    }

    if (dto.decision === ClearanceReviewDecision.RETURN && !assignment.template.requiresEmployeeCompletion) {
      throw new BadRequestException("This form doesn't require any action from the employee, so it can't be returned to them.")
    }

    if (dto.decision === ClearanceReviewDecision.RETURN) {
      const updated = await this.prisma.exitClearanceFormAssignment.update({
        where: { id: assignmentId },
        data: {
          status: ExitClearanceStatus.REJECTED,
          employeeCompletedAt: null,
          employeeCompletedById: null,
          lastActionComment: dto.comment,
        },
        include: ASSIGNMENT_INCLUDE,
      })
      await this.log(assignmentId, ExitClearanceAuditAction.RETURNED, dto.reviewerId, dto.comment)
      await this.notifyEmployee(updated, NotificationType.EXIT_CLEARANCE_RETURNED, "Exit clearance form returned", `Your "${updated.template.name}" form was returned: ${dto.comment}`, "exit_clearance_form_returned", { comment: dto.comment ?? "" })
      return updated
    }

    const now = new Date()
    const confirmedAt = assignment.template.requiresConfirmation ? now : assignment.confirmedAt
    const signedAt = assignment.template.requiresSignature ? now : assignment.signedAt

    const updated = await this.prisma.exitClearanceFormAssignment.update({
      where: { id: assignmentId },
      data: {
        status: this.computeStatus(assignment.template, { employeeCompletedAt: assignment.employeeCompletedAt, confirmedAt, signedAt }),
        confirmedAt,
        confirmedById: assignment.template.requiresConfirmation ? dto.reviewerId : assignment.confirmedById,
        signedAt,
        signedById: assignment.template.requiresSignature ? dto.reviewerId : assignment.signedById,
        lastActionComment: dto.comment ?? null,
      },
      include: ASSIGNMENT_INCLUDE,
    })
    await this.log(assignmentId, ExitClearanceAuditAction.APPROVED, dto.reviewerId, dto.comment)
    await this.notifyEmployee(updated, NotificationType.EXIT_CLEARANCE_APPROVED, "Exit clearance form approved", `Your "${updated.template.name}" form has been approved.`, "exit_clearance_form_approved", {})
    return updated
  }

  private async notifyEmployee(
    assignment: { employeeId: string; employee: { firstName: string; lastName: string; email: string } },
    type: NotificationType,
    title: string,
    message: string,
    emailTemplateKey: string,
    extraVariables: Record<string, string>
  ) {
    await this.notificationsService.create({
      recipientEmployeeId: assignment.employeeId,
      type,
      title,
      message,
      relatedEmployeeId: assignment.employeeId,
      actionUrl: EMPLOYEE_PROGRESS_URL,
    })
    await this.safeSendEmail({
      templateKey: emailTemplateKey,
      recipientEmail: assignment.employee.email,
      recipientEmployeeId: assignment.employeeId,
      relatedModule: "exit",
      relatedEntityId: assignment.employeeId,
      variables: { employee_name: `${assignment.employee.firstName} ${assignment.employee.lastName}`, clearance_url: buildClientUrl(EMPLOYEE_PROGRESS_URL), ...extraVariables },
    })
  }
}
