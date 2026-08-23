import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { DisciplinaryCaseCategory, DisciplinaryCaseStatus, Prisma } from "@prisma/client"

import { EmployeesService } from "../../employees/employees.service"
import { EmailService } from "../../email/email.service"
import { EmployeeRelationsAccessService } from "../access/employee-relations-access.service"
import { PrismaService } from "../../../prisma/prisma.service"

import { CloseCaseDto } from "./dto/close-case.dto"
import { CreateDisciplinaryCaseDto } from "./dto/create-disciplinary-case.dto"
import { ScheduleMeetingDto } from "./dto/schedule-meeting.dto"
import { UpdateDisciplinaryCaseDto } from "./dto/update-disciplinary-case.dto"

const EMPLOYEE_SUMMARY_SELECT = {
  employeeNumber: true,
  firstName: true,
  lastName: true,
  employmentStatus: true,
  position: { select: { id: true, title: true, department: { select: { id: true, name: true } }, unit: { select: { id: true, name: true } } } },
  branch: { select: { id: true, name: true } },
} as const

const CASE_INCLUDE = {
  employee: { select: EMPLOYEE_SUMMARY_SELECT },
  reportedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
  meetings: {
    orderBy: { scheduledAt: "desc" as const },
    include: {
      invitees: { include: { employee: { select: { employeeNumber: true, firstName: true, lastName: true } } } },
    },
  },
  investigations: {
    include: { investigator: { select: { employeeNumber: true, firstName: true, lastName: true } } },
    orderBy: { startDate: "desc" as const },
  },
  sanctions: {
    include: {
      sanctionType: true,
      issuedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
      approvalAuthority: { select: { employeeNumber: true, firstName: true, lastName: true } },
    },
    orderBy: { dateOfSanction: "desc" as const },
  },
  appeals: {
    include: { decidedBy: { select: { employeeNumber: true, firstName: true, lastName: true } } },
    orderBy: { appealDate: "desc" as const },
  },
} as const

export interface DisciplinaryCaseFilters {
  employeeId?: string
  status?: string
  category?: string
}

const OPEN_STATUSES: DisciplinaryCaseStatus[] = ["DRAFT", "UNDER_INVESTIGATION", "PENDING_DECISION", "SANCTION_ISSUED", "APPEALED"]

@Injectable()
export class DisciplinaryCasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: EmployeeRelationsAccessService,
    private readonly employeesService: EmployeesService,
    private readonly emailService: EmailService
  ) {}

  /** Same pattern as InterviewsService — enqueue() already logs internally
   *  on failure, so a broken/misconfigured mailer should never fail the
   *  meeting-scheduling request itself. */
  private async safeSendEmail(params: Parameters<EmailService["enqueue"]>[0]) {
    try {
      await this.emailService.enqueue(params)
    } catch {
      // EmailService.enqueue() already logs internally.
    }
  }

  async findAll(filters: DisciplinaryCaseFilters, actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    const where: Prisma.DisciplinaryCaseWhereInput = {
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.status ? { status: filters.status as DisciplinaryCaseStatus } : {}),
      ...(filters.category ? { category: filters.category as DisciplinaryCaseCategory } : {}),
    }
    return this.prisma.disciplinaryCase.findMany({
      where: scope.allowAll ? where : { AND: [this.accessService.buildCaseWhere(scope), where] },
      include: CASE_INCLUDE,
      orderBy: { dateReported: "desc" },
    })
  }

  async findOne(id: string, actingEmployeeId: string) {
    const disciplinaryCase = await this.prisma.disciplinaryCase.findUnique({ where: { id }, include: CASE_INCLUDE })
    if (!disciplinaryCase) {
      throw new NotFoundException(`Disciplinary case ${id} not found`)
    }
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (!this.accessService.canAccessCase(scope, disciplinaryCase)) {
      throw new ForbiddenException("You don't have access to this case")
    }
    return disciplinaryCase
  }

  /** Permanent Employee Relations history for one employee — never
   *  filtered out even after exit, see schema module doc comment. */
  async findHistoryForEmployee(employeeId: string, actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (!scope.allowAll && employeeId !== actingEmployeeId && !scope.directReportIds.has(employeeId)) {
      throw new ForbiddenException("You don't have access to this employee's Employee Relations history")
    }
    const isSelfOrHr = scope.allowAll || employeeId === scope.actingEmployeeId
    const cases = await this.prisma.disciplinaryCase.findMany({
      where: isSelfOrHr ? { employeeId } : { employeeId, isConfidential: false },
      include: CASE_INCLUDE,
      orderBy: { dateReported: "desc" },
    })
    // Grievances stay HR-only + the employee themselves, even in this
    // combined history view — a line manager viewing a report's ER history
    // never sees grievance content, per the spec's "only authorized HR
    // personnel" rule.
    const grievances = isSelfOrHr
      ? await this.prisma.grievance.findMany({ where: { employeeId }, orderBy: { dateSubmitted: "desc" } })
      : []
    return { cases, grievances }
  }

  async create(dto: CreateDisciplinaryCaseDto) {
    const caseNumber = await this.generateCaseNumber()
    const disciplinaryCase = await this.prisma.disciplinaryCase.create({
      data: { ...dto, caseNumber },
      include: CASE_INCLUDE,
    })
    await this.log(disciplinaryCase.id, "CREATED", dto.reportedById)
    return disciplinaryCase
  }

  async update(id: string, dto: UpdateDisciplinaryCaseDto, actingEmployeeId: string) {
    await this.findOne(id, actingEmployeeId)
    const updated = await this.prisma.disciplinaryCase.update({ where: { id }, data: dto, include: CASE_INCLUDE })
    await this.log(id, "UPDATED", actingEmployeeId)
    return updated
  }

  /** Moves a DRAFT case into the active pipeline — straight to
   *  PENDING_DECISION if no investigation is required, otherwise
   *  UNDER_INVESTIGATION. Notifies the employee's line manager that the
   *  case needs their input, unless it's confidential. */
  async submit(id: string, actingEmployeeId: string) {
    const disciplinaryCase = await this.findOne(id, actingEmployeeId)
    if (disciplinaryCase.status !== "DRAFT") {
      throw new BadRequestException("Only a draft case can be submitted.")
    }

    const updated = await this.prisma.disciplinaryCase.update({
      where: { id },
      data: { status: disciplinaryCase.investigationRequired ? "UNDER_INVESTIGATION" : "PENDING_DECISION" },
      include: CASE_INCLUDE,
    })
    await this.log(id, "SUBMITTED", actingEmployeeId)

    if (!disciplinaryCase.isConfidential) {
      const { manager } = await this.employeesService.getReportingManager(disciplinaryCase.employeeId)
      if (manager) {
        await this.notify(manager.id, "ERC_MANAGER_INPUT_NEEDED", "Disciplinary case requires your input", `A disciplinary case (${disciplinaryCase.caseNumber}) involving one of your team members needs your input.`, id)
      }
    }

    return updated
  }

  async close(id: string, dto: CloseCaseDto) {
    const disciplinaryCase = await this.findOne(id, dto.actingEmployeeId)
    if (disciplinaryCase.status === "CLOSED") {
      throw new BadRequestException("This case is already closed.")
    }
    const updated = await this.prisma.disciplinaryCase.update({
      where: { id },
      data: { status: "CLOSED", closedAt: new Date() },
      include: CASE_INCLUDE,
    })
    await this.log(id, "CLOSED", dto.actingEmployeeId, dto.comments)
    return updated
  }

  async scheduleMeeting(caseId: string, dto: ScheduleMeetingDto) {
    const disciplinaryCase = await this.findOne(caseId, dto.createdById)
    const meeting = await this.prisma.disciplinaryMeeting.create({
      data: {
        disciplinaryCaseId: caseId,
        subject: dto.subject,
        scheduledAt: dto.scheduledAt,
        location: dto.location,
        notes: dto.notes,
        createdById: dto.createdById,
        invitees: dto.inviteeIds?.length ? { create: dto.inviteeIds.map((employeeId) => ({ employeeId })) } : undefined,
      },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        invitees: { include: { employee: { select: { employeeNumber: true, firstName: true, lastName: true, email: true } } } },
      },
    })
    await this.log(caseId, "MEETING_SCHEDULED", dto.createdById, dto.notes)
    await this.notify(
      disciplinaryCase.employeeId,
      "ERC_MEETING_SCHEDULED",
      "Disciplinary meeting scheduled",
      `A meeting has been scheduled for ${dto.scheduledAt.toLocaleString()} regarding case ${disciplinaryCase.caseNumber}.`,
      caseId
    )

    // Invitee emails deliberately carry only the meeting's own subject/
    // description/date/location — never the case number, category, or the
    // employee it concerns — see DisciplinaryMeetingInvitee's schema doc
    // comment on why. Sent in-app-notified employee is excluded from this
    // fan-out on purpose: they're already covered by the notify() call above.
    const meetingSubject = meeting.subject?.trim() || "Disciplinary meeting"
    const organizerName = `${meeting.createdBy.firstName} ${meeting.createdBy.lastName}`
    for (const invitee of meeting.invitees) {
      await this.safeSendEmail({
        templateKey: "erc_meeting_invitation",
        recipientEmail: invitee.employee.email,
        recipientEmployeeId: invitee.employee.employeeNumber,
        relatedModule: "employee-relations",
        relatedEntityId: meeting.id,
        variables: {
          invitee_name: `${invitee.employee.firstName} ${invitee.employee.lastName}`,
          organizer_name: organizerName,
          meeting_subject: meetingSubject,
          meeting_description: meeting.notes ?? "",
          meeting_date: meeting.scheduledAt.toISOString().slice(0, 10),
          meeting_time: meeting.scheduledAt.toISOString().slice(11, 16),
          meeting_location: meeting.location ?? "Not specified",
        },
      })
    }

    return meeting
  }

  /** Employees/managers ask "is this case still open" a lot — a small,
   *  purely computed helper rather than a stored flag. */
  isOpen(status: DisciplinaryCaseStatus) {
    return OPEN_STATUSES.includes(status)
  }

  private async generateCaseNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `ERC-${year}-`
    const cases = await this.prisma.disciplinaryCase.findMany({
      where: { caseNumber: { startsWith: prefix } },
      select: { caseNumber: true },
    })
    const max = cases.reduce((highest, item) => {
      const match = new RegExp(`^${prefix}(\\d+)$`).exec(item.caseNumber)
      return match ? Math.max(highest, parseInt(match[1], 10)) : highest
    }, 0)
    return `${prefix}${String(max + 1).padStart(4, "0")}`
  }

  private async notify(
    recipientEmployeeId: string,
    type: "ERC_MEETING_SCHEDULED" | "ERC_DECISION_ISSUED" | "ERC_APPEAL_DECIDED" | "ERC_MANAGER_INPUT_NEEDED" | "ERC_INVESTIGATION_OVERDUE" | "ERC_APPEAL_SUBMITTED",
    title: string,
    message: string,
    caseId: string,
    forAdmin = false
  ) {
    await this.prisma.notification.create({
      data: {
        recipientEmployeeId,
        type,
        title,
        message,
        actionUrl: forAdmin ? `/admin/employee-relations/cases/${caseId}` : `/staff/employee-relations/cases/${caseId}`,
      },
    })
  }

  private async log(id: string, action: string, actorId: string | null, notes?: string) {
    await this.prisma.employeeRelationsAuditLog.create({ data: { entityType: "DisciplinaryCase", entityId: id, action, actorId, notes: notes || null } })
  }
}
