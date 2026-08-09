import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"
import { LeaveRequestStatus, NotificationType, Prisma } from "@prisma/client"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../../common/pagination"
import { buildClientUrl } from "../../../common/client-url.util"
import { PrismaService } from "../../../prisma/prisma.service"
import { EmailService } from "../../email/email.service"
import { LeaveBalancesService } from "../leave-balances/leave-balances.service"
import { LeaveCalendarService } from "../leave-policy/leave-calendar.service"
import { NotificationsService } from "../notifications/notifications.service"

import { CancelLeaveRequestDto, CreateLeaveRequestDto, DecideApprovalDto } from "./dto/leave-request.dto"

const REQUEST_INCLUDE = {
  employee: {
    select: {
      employeeNumber: true,
      firstName: true,
      lastName: true,
      email: true,
      gender: true,
      branch: { select: { id: true, name: true } },
      position: { select: { id: true, title: true, departmentId: true, department: { select: { id: true, name: true } } } },
    },
  },
  leaveType: true,
  delegate: { select: { employeeNumber: true, firstName: true, lastName: true } },
  approvals: { orderBy: { order: "asc" as const }, include: { approver: { select: { employeeNumber: true, firstName: true, lastName: true } } } },
  attachments: { include: { requirement: true } },
  cancelledBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
} as const

const OPEN_STATUSES: LeaveRequestStatus[] = ["SUBMITTED", "PENDING_APPROVAL", "APPROVED"]

// Prisma's interactive-transaction default timeout (5s) is too tight for a
// pooled Neon connection under cold-start latency — each awaited query in
// these transactions is its own round trip, and a slow one can easily push
// the whole chain past 5s even though no single step is actually stuck.
// Bumped generously rather than trimmed to the bone; these transactions
// still normally complete in well under a second.
const TRANSACTION_OPTIONS = { timeout: 15000, maxWait: 10000 }

/**
 * Owns the full leave-request lifecycle: validated creation (balance,
 * overlap/duplicate, gender restriction, documentation requirement),
 * the configurable approval workflow (walks LeaveApprovalStep in order,
 * resolving LINE_MANAGER the same way EmployeesService.getReportingManager
 * does — duplicated locally rather than depending on EmployeesModule, to
 * avoid a module import cycle with LeaveBalancesModule, which
 * EmployeesModule already depends on), and cancellation.
 */
@Injectable()
export class LeaveRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveBalancesService: LeaveBalancesService,
    private readonly leaveCalendarService: LeaveCalendarService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService
  ) {}

  /** Emails always go out through EmailService.enqueue() — a DB insert, not
   *  a live SMTP call — so it's safe to await these right alongside the
   *  existing in-app NotificationsService calls without risking this
   *  method's own transaction timeout. Best-effort: never lets a broken
   *  template or missing employee row fail the underlying leave action. */
  private async safeSendEmail(params: Parameters<EmailService["enqueue"]>[0]) {
    try {
      await this.emailService.enqueue(params)
    } catch {
      // EmailService.enqueue() already logs internally.
    }
  }

  private async getEmployeeEmail(employeeId: string): Promise<string | null> {
    const employee = await this.prisma.employee.findUnique({ where: { employeeNumber: employeeId }, select: { email: true } })
    return employee?.email ?? null
  }

  private buildFindAllWhere(filters: {
    employeeId?: string
    departmentId?: string
    branchId?: string
    status?: LeaveRequestStatus
    leaveTypeId?: string
    from?: Date
    to?: Date
  }): Prisma.LeaveRequestWhereInput {
    return {
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.leaveTypeId ? { leaveTypeId: filters.leaveTypeId } : {}),
      ...(filters.departmentId ? { employee: { position: { departmentId: filters.departmentId } } } : {}),
      ...(filters.branchId ? { employee: { branchId: filters.branchId } } : {}),
      ...(filters.from ? { endDate: { gte: filters.from } } : {}),
      ...(filters.to ? { startDate: { lte: filters.to } } : {}),
    }
  }

  /** Full, unpaginated list — used by filter dropdowns/calendars/analytics
   *  throughout the app. See findAllPaginated() for table views. */
  async findAll(filters: {
    employeeId?: string
    departmentId?: string
    branchId?: string
    status?: LeaveRequestStatus
    leaveTypeId?: string
    from?: Date
    to?: Date
  }) {
    return this.prisma.leaveRequest.findMany({
      where: this.buildFindAllWhere(filters),
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: "desc" },
    })
  }

  /** Paginated version for the Approvals and My Requests tables. */
  async findAllPaginated(
    filters: {
      employeeId?: string
      departmentId?: string
      branchId?: string
      status?: LeaveRequestStatus
      leaveTypeId?: string
      from?: Date
      to?: Date
    },
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResult<Prisma.LeaveRequestGetPayload<{ include: typeof REQUEST_INCLUDE }>>> {
    const where = this.buildFindAllWhere(filters)
    const { skip, take, page: normalizedPage, pageSize: normalizedPageSize } = normalizePagination(
      page,
      pageSize
    )

    const [data, total] = await this.prisma.$transaction([
      this.prisma.leaveRequest.findMany({
        where,
        include: REQUEST_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.leaveRequest.count({ where }),
    ])

    return buildPaginatedResult(data, total, normalizedPage, normalizedPageSize)
  }

  async findOne(id: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: REQUEST_INCLUDE,
    })
    if (!request) {
      throw new NotFoundException(`Leave request ${id} not found`)
    }
    return request
  }

  async previewDays(startDate: Date, endDate: Date) {
    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException("End date must be on or after the start date.")
    }
    return this.leaveCalendarService.compute(startDate, endDate)
  }

  async create(dto: CreateLeaveRequestDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNumber: dto.employeeId },
      select: { employeeNumber: true, gender: true, isActive: true },
    })
    if (!employee) {
      throw new NotFoundException(`Employee ${dto.employeeId} not found`)
    }
    if (!employee.isActive) {
      throw new BadRequestException("This employee is not active.")
    }

    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: dto.leaveTypeId },
      include: {
        approvalSteps: { orderBy: { order: "asc" } },
        attachmentRequirements: true,
      },
    })
    if (!leaveType || !leaveType.isActive) {
      throw new NotFoundException(`Leave type ${dto.leaveTypeId} not found`)
    }
    if (leaveType.genderRestriction && leaveType.genderRestriction !== employee.gender) {
      throw new BadRequestException(`${leaveType.name} is not available for this employee.`)
    }

    if (dto.endDate.getTime() < dto.startDate.getTime()) {
      throw new BadRequestException("End date must be on or after the start date.")
    }

    const { numberOfDays, returnDate } = await this.leaveCalendarService.compute(
      dto.startDate,
      dto.endDate,
      leaveType
    )
    if (numberOfDays === 0) {
      throw new BadRequestException("This date range contains no working days.")
    }

    if (leaveType.requiresDocumentation) {
      const overThreshold =
        leaveType.documentationThresholdDays == null ||
        numberOfDays > leaveType.documentationThresholdDays
      if (overThreshold && !dto.attachmentUrl) {
        const suffix = leaveType.documentationThresholdDays
          ? ` for requests longer than ${leaveType.documentationThresholdDays} day(s)`
          : ""
        throw new BadRequestException(`${leaveType.name} requires supporting documentation${suffix}.`)
      }
    }

    // Named attachment requirements (e.g. "Medical Certificate") — distinct
    // from the generic requiresDocumentation check above. Every mandatory,
    // active requirement for this leave type must have a matching upload.
    const providedRequirementIds = new Set((dto.attachments ?? []).map((attachment) => attachment.requirementId))
    const missingRequirements = leaveType.attachmentRequirements.filter(
      (requirement) => requirement.isMandatory && !providedRequirementIds.has(requirement.id)
    )
    if (missingRequirements.length > 0) {
      throw new BadRequestException(
        `${leaveType.name} requires the following document(s): ${missingRequirements.map((r) => r.name).join(", ")}.`
      )
    }

    // Overlap / duplicate check — any other open request for this employee
    // that shares a day with the requested range.
    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId: dto.employeeId,
        status: { in: OPEN_STATUSES },
        startDate: { lte: dto.endDate },
        endDate: { gte: dto.startDate },
      },
    })
    if (overlapping) {
      throw new BadRequestException("This overlaps with an existing leave request.")
    }

    const year = dto.startDate.getUTCFullYear()
    const balance = await this.leaveBalancesService.getOrCreate(dto.employeeId, dto.leaveTypeId, year)
    const remaining =
      balance.entitledDays + balance.carriedForwardDays + balance.adjustmentDays -
      balance.takenDays -
      balance.pendingDays

    if (numberOfDays > remaining && !dto.hrOverride) {
      throw new BadRequestException(
        `Insufficient balance: ${remaining} day(s) remaining, ${numberOfDays} requested. An HR override is required to proceed.`
      )
    }

    const steps = leaveType.approvalSteps
    const firstStep = steps[0]

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.leaveRequest.create({
        data: {
          employeeId: dto.employeeId,
          leaveTypeId: dto.leaveTypeId,
          startDate: dto.startDate,
          endDate: dto.endDate,
          returnDate: dto.returnDate ?? returnDate,
          numberOfDays,
          reason: dto.reason,
          attachmentUrl: dto.attachmentUrl,
          delegateEmployeeId: dto.delegateEmployeeId,
          hrOverride: dto.hrOverride ?? false,
          status: firstStep ? LeaveRequestStatus.PENDING_APPROVAL : LeaveRequestStatus.APPROVED,
          currentStepOrder: firstStep?.order ?? null,
        },
      })

      if (steps.length > 0) {
        await tx.leaveApproval.createMany({
          data: steps.map((step) => ({
            leaveRequestId: created.id,
            stepId: step.id,
            order: step.order,
            role: step.role,
          })),
        })
      }

      if (dto.attachments && dto.attachments.length > 0) {
        await tx.leaveRequestAttachment.createMany({
          data: dto.attachments.map((attachment) => ({
            leaveRequestId: created.id,
            requirementId: attachment.requirementId,
            purpose: "SUBMISSION",
            fileUrl: attachment.fileUrl,
          })),
        })
      }

      await this.leaveBalancesService.reserve(dto.employeeId, dto.leaveTypeId, year, numberOfDays, tx)
      if (!firstStep) {
        // No workflow configured for this type — auto-approved, book straight to taken.
        await this.leaveBalancesService.commit(dto.employeeId, dto.leaveTypeId, year, numberOfDays, tx)
      }

      await this.notificationsService.create(
        {
          recipientEmployeeId: dto.employeeId,
          type: NotificationType.LEAVE_SUBMITTED,
          title: "Leave request submitted",
          message: `Your ${leaveType.name} request for ${numberOfDays} day(s) has been submitted.`,
          relatedLeaveRequestId: created.id,
        },
        tx
      )

      return created
    }, TRANSACTION_OPTIONS)

    const populated = await this.findOne(request.id)
    const employeeName = `${populated.employee.firstName} ${populated.employee.lastName}`
    const startDateStr = populated.startDate.toISOString().slice(0, 10)
    const endDateStr = populated.endDate.toISOString().slice(0, 10)

    await this.safeSendEmail({
      templateKey: "leave_submitted",
      recipientEmail: populated.employee.email,
      recipientEmployeeId: populated.employee.employeeNumber,
      relatedModule: "leave",
      relatedEntityId: populated.id,
      variables: {
        employee_name: employeeName,
        leave_type: populated.leaveType.name,
        start_date: startDateStr,
        end_date: endDateStr,
        days: populated.numberOfDays,
        approver_name: firstStep ? "your approving manager" : "N/A — auto-approved",
      },
    })

    if (firstStep?.role === "LINE_MANAGER") {
      const managerId = await this.resolveLineManagerId(dto.employeeId)
      if (managerId) {
        await this.notificationsService.create({
          recipientEmployeeId: managerId,
          type: NotificationType.APPROVAL_NEEDED,
          title: "Leave request awaiting your approval",
          message: `A ${leaveType.name} request needs your approval.`,
          relatedLeaveRequestId: request.id,
        })
        const managerEmail = await this.getEmployeeEmail(managerId)
        if (managerEmail) {
          await this.safeSendEmail({
            templateKey: "leave_approval_needed",
            recipientEmail: managerEmail,
            recipientEmployeeId: managerId,
            relatedModule: "leave",
            relatedEntityId: populated.id,
            variables: {
              employee_name: employeeName,
              leave_type: populated.leaveType.name,
              start_date: startDateStr,
              end_date: endDateStr,
              days: populated.numberOfDays,
              approval_url: buildClientUrl("/admin/leave/approvals"),
            },
          })
        }
      }
    }

    return populated
  }

  /**
   * Acts on the request's currently-pending step. Approving the final step
   * moves the reservation from pending to taken and closes the request out
   * as APPROVED; approving an earlier step just advances currentStepOrder.
   * Rejecting at any step releases the reservation and closes the request
   * out as REJECTED — the whole request is rejected, not just that step.
   */
  async decide(id: string, dto: DecideApprovalDto) {
    const request = await this.findOne(id)
    if (request.status !== "PENDING_APPROVAL" || request.currentStepOrder == null) {
      throw new BadRequestException("This request is not awaiting approval.")
    }

    const currentApproval = request.approvals.find((a) => a.order === request.currentStepOrder)
    if (!currentApproval) {
      throw new BadRequestException("This request has no matching approval step on record.")
    }

    await this.assertCanDecideStep(currentApproval.role, request.employeeId, dto.actingEmployeeId)

    const year = request.startDate.getUTCFullYear()

    return this.prisma.$transaction(async (tx) => {
      await tx.leaveApproval.update({
        where: { id: currentApproval.id },
        data: {
          decision: dto.decision,
          comment: dto.comment,
          approverEmployeeId: dto.actingEmployeeId,
          decidedAt: new Date(),
        },
      })

      if (dto.decision === "REJECTED") {
        await this.leaveBalancesService.release(
          request.employeeId,
          request.leaveTypeId,
          year,
          request.numberOfDays,
          tx
        )
        const updated = await tx.leaveRequest.update({
          where: { id },
          data: { status: LeaveRequestStatus.REJECTED, currentStepOrder: null },
          include: REQUEST_INCLUDE,
        })
        await this.notificationsService.create(
          {
            recipientEmployeeId: request.employeeId,
            type: NotificationType.LEAVE_REJECTED,
            title: "Leave request rejected",
            message: `Your ${request.leaveType.name} request was rejected.${dto.comment ? ` Reason: ${dto.comment}` : ""}`,
            relatedLeaveRequestId: id,
          },
          tx
        )
        const rejectingApprover = await tx.employee.findUnique({ where: { employeeNumber: dto.actingEmployeeId }, select: { firstName: true, lastName: true } })
        await this.emailService.enqueue(
          {
            templateKey: "leave_rejected",
            recipientEmail: request.employee.email,
            recipientEmployeeId: request.employeeId,
            relatedModule: "leave",
            relatedEntityId: id,
            variables: {
              employee_name: `${request.employee.firstName} ${request.employee.lastName}`,
              leave_type: request.leaveType.name,
              start_date: request.startDate.toISOString().slice(0, 10),
              end_date: request.endDate.toISOString().slice(0, 10),
              approver_name: rejectingApprover ? `${rejectingApprover.firstName} ${rejectingApprover.lastName}` : "HR",
              decision_comment: dto.comment ?? "No reason provided.",
            },
          },
          tx
        )
        return updated
      }

      const steps = await tx.leaveApprovalStep.findMany({
        where: { leaveTypeId: request.leaveTypeId },
        orderBy: { order: "asc" },
      })
      const nextStep = steps.find((step) => step.order > request.currentStepOrder!)

      if (nextStep) {
        const updated = await tx.leaveRequest.update({
          where: { id },
          data: { currentStepOrder: nextStep.order },
          include: REQUEST_INCLUDE,
        })
        return updated
      }

      await this.leaveBalancesService.commit(
        request.employeeId,
        request.leaveTypeId,
        year,
        request.numberOfDays,
        tx
      )
      const updated = await tx.leaveRequest.update({
        where: { id },
        data: { status: LeaveRequestStatus.APPROVED, currentStepOrder: null },
        include: REQUEST_INCLUDE,
      })
      await this.notificationsService.create(
        {
          recipientEmployeeId: request.employeeId,
          type: NotificationType.LEAVE_APPROVED,
          title: "Leave request approved",
          message: `Your ${request.leaveType.name} request for ${request.numberOfDays} day(s) has been approved.`,
          relatedLeaveRequestId: id,
        },
        tx
      )
      const approvingApprover = await tx.employee.findUnique({ where: { employeeNumber: dto.actingEmployeeId }, select: { firstName: true, lastName: true } })
      await this.emailService.enqueue(
        {
          templateKey: "leave_approved",
          recipientEmail: request.employee.email,
          recipientEmployeeId: request.employeeId,
          relatedModule: "leave",
          relatedEntityId: id,
          variables: {
            employee_name: `${request.employee.firstName} ${request.employee.lastName}`,
            leave_type: request.leaveType.name,
            start_date: request.startDate.toISOString().slice(0, 10),
            end_date: request.endDate.toISOString().slice(0, 10),
            approver_name: approvingApprover ? `${approvingApprover.firstName} ${approvingApprover.lastName}` : "HR",
          },
        },
        tx
      )
      return updated
    }, TRANSACTION_OPTIONS)
  }

  /** The employee may cancel before it begins; per spec this is "subject to
   *  approval rules" — interpreted here as: freely cancellable while still
   *  pending, and cancellable once approved only if it hasn't started yet.
   *  A cancellation reason is mandatory and stored permanently for
   *  auditing (never overwritten/cleared), with an optional attachment;
   *  the employee's manager and HR are both notified. */
  async cancel(id: string, dto: CancelLeaveRequestDto) {
    const request = await this.findOne(id)

    if (!OPEN_STATUSES.includes(request.status)) {
      throw new BadRequestException("This request can no longer be cancelled.")
    }

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    if (request.status === "APPROVED" && request.startDate.getTime() <= today.getTime()) {
      throw new BadRequestException("This leave has already started and can no longer be cancelled.")
    }

    const year = request.startDate.getUTCFullYear()

    const updated = await this.prisma.$transaction(async (tx) => {
      if (request.status === "APPROVED") {
        await this.leaveBalancesService.reverseTaken(
          request.employeeId,
          request.leaveTypeId,
          year,
          request.numberOfDays,
          tx
        )
      } else {
        await this.leaveBalancesService.release(
          request.employeeId,
          request.leaveTypeId,
          year,
          request.numberOfDays,
          tx
        )
      }

      const result = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: LeaveRequestStatus.CANCELLED,
          currentStepOrder: null,
          cancellationReason: dto.cancellationReason,
          cancelledAt: new Date(),
          cancelledById: dto.actingEmployeeId,
        },
        include: REQUEST_INCLUDE,
      })

      if (dto.attachmentUrl) {
        await tx.leaveRequestAttachment.create({
          data: { leaveRequestId: id, purpose: "CANCELLATION", fileUrl: dto.attachmentUrl },
        })
      }

      await this.notificationsService.create(
        {
          recipientEmployeeId: request.employeeId,
          type: NotificationType.LEAVE_CANCELLED,
          title: "Leave request cancelled",
          message: `Your ${request.leaveType.name} request has been cancelled.`,
          relatedLeaveRequestId: id,
        },
        tx
      )
      await this.emailService.enqueue(
        {
          templateKey: "leave_cancelled",
          recipientEmail: request.employee.email,
          recipientEmployeeId: request.employeeId,
          relatedModule: "leave",
          relatedEntityId: id,
          variables: {
            employee_name: `${request.employee.firstName} ${request.employee.lastName}`,
            leave_type: request.leaveType.name,
            start_date: request.startDate.toISOString().slice(0, 10),
            end_date: request.endDate.toISOString().slice(0, 10),
          },
        },
        tx
      )

      await this.notificationsService.createForAllAdmins(
        {
          type: NotificationType.LEAVE_CANCELLED,
          title: "Leave request cancelled",
          message: `${request.employee.firstName} ${request.employee.lastName} cancelled their ${request.leaveType.name} request. Reason: ${dto.cancellationReason}`,
          relatedLeaveRequestId: id,
        },
        tx
      )

      return result
    }, TRANSACTION_OPTIONS)

    const managerId = await this.resolveLineManagerId(request.employeeId)
    if (managerId) {
      await this.notificationsService.create({
        recipientEmployeeId: managerId,
        type: NotificationType.LEAVE_CANCELLED,
        title: "Leave request cancelled",
        message: `${request.employee.firstName} ${request.employee.lastName}, who reports to you, cancelled their ${request.leaveType.name} request.`,
        relatedLeaveRequestId: id,
      })
    }

    return updated
  }

  /** Requests where the current step is LINE_MANAGER and this employee is
   *  the resolved line manager of the requester — powers a manager's "my
   *  team's approvals" queue. HR sees everything pending via findAll()
   *  with status=PENDING_APPROVAL instead (no separate HR-role concept). */
  async findPendingForManager(managerEmployeeId: string) {
    const pending = await this.prisma.leaveRequest.findMany({
      where: { status: "PENDING_APPROVAL" },
      include: REQUEST_INCLUDE,
    })

    const results = []
    for (const request of pending) {
      const currentApproval = request.approvals.find((a) => a.order === request.currentStepOrder)
      if (currentApproval?.role !== "LINE_MANAGER") continue
      const managerId = await this.resolveLineManagerId(request.employeeId)
      if (managerId === managerEmployeeId) results.push(request)
    }
    return results
  }

  async getCalendarData(
    year: number,
    month: number,
    filters: { departmentId?: string; branchId?: string }
  ) {
    const rangeStart = new Date(Date.UTC(year, month - 1, 1))
    const rangeEnd = new Date(Date.UTC(year, month, 0))

    const [requests, holidays] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: {
          status: { in: ["PENDING_APPROVAL", "APPROVED"] },
          startDate: { lte: rangeEnd },
          endDate: { gte: rangeStart },
          ...(filters.departmentId ? { employee: { position: { departmentId: filters.departmentId } } } : {}),
          ...(filters.branchId ? { employee: { branchId: filters.branchId } } : {}),
        },
        include: REQUEST_INCLUDE,
      }),
      this.prisma.publicHoliday.findMany({ where: { isActive: true } }),
    ])

    const holidaysInRange = holidays.filter((holiday) => {
      if (holiday.isRecurringAnnually) return true
      return holiday.date.getUTCFullYear() === year
    })

    return { requests, holidays: holidaysInRange }
  }

  /**
   * Same resolution EmployeesService.getReportingManager uses (override
   * first, else the position hierarchy) — duplicated here rather than
   * depending on EmployeesModule to avoid a module import cycle, since
   * EmployeesModule already depends on LeaveBalancesModule.
   */
  private async resolveLineManagerId(employeeId: string): Promise<string | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNumber: employeeId },
      include: { reportingManagerOverride: true, position: true },
    })
    if (!employee) return null
    if (employee.reportingManagerOverride) return employee.reportingManagerOverride.employeeNumber
    if (!employee.position?.reportsToPositionId) return null

    const holder = await this.prisma.employee.findFirst({
      where: { positionId: employee.position.reportsToPositionId, isActive: true },
    })
    return holder?.employeeNumber ?? null
  }

  /**
   * decide() used to write whatever `actingEmployeeId` the caller supplied
   * with no verification at all — harmless while only admins could reach
   * the approvals page (client/middleware.ts gated the whole /admin tree),
   * but no longer safe now that line managers get their own staff-portal
   * approvals queue (see findPendingForManager()). A LINE_MANAGER step can
   * only be decided by the requester's actually-resolved line manager; an
   * HR step can only be decided by an admin (this app has no separate
   * HR-role concept — see schema.prisma's ApprovalRole doc comment).
   */
  private async assertCanDecideStep(
    role: "LINE_MANAGER" | "HR",
    requesterEmployeeId: string,
    actingEmployeeId: string | undefined
  ) {
    if (!actingEmployeeId) {
      throw new BadRequestException("actingEmployeeId is required to decide an approval step.")
    }

    if (role === "LINE_MANAGER") {
      const resolvedManagerId = await this.resolveLineManagerId(requesterEmployeeId)
      if (!resolvedManagerId || resolvedManagerId !== actingEmployeeId) {
        throw new ForbiddenException("Only this employee's resolved line manager can decide this approval step.")
      }
      return
    }

    const actor = await this.prisma.employee.findUnique({
      where: { employeeNumber: actingEmployeeId },
      select: { isAdmin: true },
    })
    if (!actor?.isAdmin) {
      throw new ForbiddenException("Only an admin can decide an HR approval step.")
    }
  }
}
