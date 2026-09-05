import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { GrievanceStatus, NotificationType, Prisma } from "@prisma/client"

import { EmployeeRelationsAccessService } from "../access/employee-relations-access.service"
import { PrismaService } from "../../../prisma/prisma.service"

import { AssignGrievanceDto } from "./dto/assign-grievance.dto"
import { CreateGrievanceDto } from "./dto/create-grievance.dto"
import { UpdateGrievanceStatusDto } from "./dto/update-grievance-status.dto"

const GRIEVANCE_INCLUDE = {
  employee: { select: { employeeNumber: true, firstName: true, lastName: true } },
  assignedTo: { select: { employeeNumber: true, firstName: true, lastName: true } },
} as const

const RESOLVED_STATUSES: GrievanceStatus[] = ["RESOLVED", "CLOSED"]

export interface GrievanceFilters {
  employeeId?: string
  status?: string
}

/** HR-only visibility (+ the submitter) — see EmployeeRelationsAccessService
 *  and the spec's "only authorized HR personnel" rule. */
@Injectable()
export class GrievancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: EmployeeRelationsAccessService
  ) {}

  async findAll(filters: GrievanceFilters, actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    const where: Prisma.GrievanceWhereInput = {
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.status ? { status: filters.status as GrievanceStatus } : {}),
    }
    return this.prisma.grievance.findMany({
      where: scope.allowAll ? where : { AND: [this.accessService.buildGrievanceWhere(scope), where] },
      include: GRIEVANCE_INCLUDE,
      orderBy: { dateSubmitted: "desc" },
    })
  }

  async findOne(id: string, actingEmployeeId: string) {
    const grievance = await this.prisma.grievance.findUnique({ where: { id }, include: GRIEVANCE_INCLUDE })
    if (!grievance) {
      throw new NotFoundException(`Grievance ${id} not found`)
    }
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (!this.accessService.canAccessGrievance(scope, grievance)) {
      throw new ForbiddenException("You don't have access to this grievance")
    }
    return grievance
  }

  async create(dto: CreateGrievanceDto) {
    const grievanceNumber = await this.generateGrievanceNumber()
    const grievance = await this.prisma.grievance.create({
      data: { ...dto, grievanceNumber },
      include: GRIEVANCE_INCLUDE,
    })
    await this.log(grievance.id, "SUBMITTED", dto.employeeId)

    // Unlike disciplinary cases (which notify the line manager instead —
    // see DisciplinaryCasesService.submit()), a grievance has no manager
    // step at all: it's HR-only from the start (see this file's class doc
    // comment), so HR needs to be told directly that one landed.
    await this.notifyAllAdmins(
      "GRIEVANCE_SUBMITTED",
      "New grievance submitted",
      `${grievance.employee.firstName} ${grievance.employee.lastName} submitted a new grievance (${grievance.grievanceNumber}).`,
      grievance.id
    )

    return grievance
  }

  async updateStatus(id: string, dto: UpdateGrievanceStatusDto) {
    const existing = await this.findOne(id, dto.actingEmployeeId)
    const resolved = RESOLVED_STATUSES.includes(dto.status)
    const updated = await this.prisma.grievance.update({
      where: { id },
      data: { status: dto.status, resolutionComments: dto.resolutionComments, resolvedAt: resolved ? new Date() : null },
      include: GRIEVANCE_INCLUDE,
    })
    await this.log(id, `STATUS_CHANGED_TO_${dto.status}`, dto.actingEmployeeId, dto.resolutionComments)

    if (resolved && !RESOLVED_STATUSES.includes(existing.status)) {
      await this.notify(
        updated.employeeId,
        "GRIEVANCE_RESOLVED",
        "Your grievance has been resolved",
        `Grievance ${updated.grievanceNumber} has been marked ${dto.status.toLowerCase()}.${dto.resolutionComments ? ` ${dto.resolutionComments}` : ""}`,
        id
      )
    }

    return updated
  }

  async assign(id: string, dto: AssignGrievanceDto) {
    await this.findOne(id, dto.actingEmployeeId)
    const updated = await this.prisma.grievance.update({
      where: { id },
      data: { assignedToId: dto.assignedToId, status: "UNDER_REVIEW" },
      include: GRIEVANCE_INCLUDE,
    })
    await this.log(id, "ASSIGNED", dto.actingEmployeeId, `Assigned to ${dto.assignedToId}`)

    await this.notify(dto.assignedToId, "GRIEVANCE_ASSIGNED", "Grievance assigned to you", `Grievance ${updated.grievanceNumber} has been assigned to you for review.`, id, true)

    return updated
  }

  private async generateGrievanceNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `GRV-${year}-`
    const grievances = await this.prisma.grievance.findMany({
      where: { grievanceNumber: { startsWith: prefix } },
      select: { grievanceNumber: true },
    })
    const max = grievances.reduce((highest, item) => {
      const match = new RegExp(`^${prefix}(\\d+)$`).exec(item.grievanceNumber)
      return match ? Math.max(highest, parseInt(match[1], 10)) : highest
    }, 0)
    return `${prefix}${String(max + 1).padStart(4, "0")}`
  }

  private async log(id: string, action: string, actorId: string | null, notes?: string) {
    await this.prisma.employeeRelationsAuditLog.create({ data: { entityType: "Grievance", entityId: id, action, actorId, notes: notes || null } })
  }

  /** Same shape as DisciplinaryCasesService's private notify() — see that
   *  file's doc comment on the admin-facing-vs-staff-facing actionUrl split. */
  private async notify(
    recipientEmployeeId: string,
    type: Extract<NotificationType, "GRIEVANCE_SUBMITTED" | "GRIEVANCE_ASSIGNED" | "GRIEVANCE_RESOLVED">,
    title: string,
    message: string,
    grievanceId: string,
    forAdmin = false
  ) {
    await this.prisma.notification.create({
      data: {
        recipientEmployeeId,
        type,
        title,
        message,
        actionUrl: forAdmin ? `/admin/employee-relations/grievances/${grievanceId}` : `/staff/employee-relations/grievances/${grievanceId}`,
      },
    })
  }

  /** Grievances have no manager-input step to notify instead (see create()'s
   *  doc comment), so this is the one place in Employee Relations that
   *  actually broadcasts to every admin — disciplinary cases never do. */
  private async notifyAllAdmins(type: Extract<NotificationType, "GRIEVANCE_SUBMITTED">, title: string, message: string, grievanceId: string) {
    const admins = await this.prisma.employee.findMany({ where: { isAdmin: true, isActive: true }, select: { employeeNumber: true } })
    if (admins.length === 0) return
    await this.prisma.notification.createMany({
      data: admins.map((admin) => ({
        recipientEmployeeId: admin.employeeNumber,
        type,
        title,
        message,
        actionUrl: `/admin/employee-relations/grievances/${grievanceId}`,
      })),
    })
  }
}
