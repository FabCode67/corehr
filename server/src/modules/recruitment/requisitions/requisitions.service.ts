import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { Prisma, RecruitmentStageName, RequisitionStatus } from "@prisma/client"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../../common/pagination"
import { PrismaService } from "../../../prisma/prisma.service"
import { PositionsService } from "../../organization/positions/positions.service"
import { RecruitmentAccessScope, RecruitmentAccessService } from "../access/recruitment-access.service"

import { ActingEmployeeDto } from "./dto/acting-employee.dto"
import { CreateRequisitionDto } from "./dto/create-requisition.dto"
import { RejectRequisitionDto } from "./dto/reject-requisition.dto"
import { ReviewRequisitionDto } from "./dto/review-requisition.dto"
import { UpdateRequisitionDto } from "./dto/update-requisition.dto"
import { UpdateStageDto } from "./dto/update-stage.dto"

export const REQUISITION_INCLUDE = {
  workforcePlan: { select: { id: true, title: true } },
  position: { select: { id: true, title: true } },
  reportsToPosition: { select: { id: true, title: true } },
  department: { select: { id: true, name: true } },
  unit: { select: { id: true, name: true } },
  function: { select: { id: true, name: true } },
  band: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  jobDescription: { select: { id: true, jobTitle: true } },
  requestedBy: { select: { employeeNumber: true, firstName: true, middleName: true, lastName: true } },
  hiringManager: { select: { employeeNumber: true, firstName: true, middleName: true, lastName: true } },
  recruiter: { select: { employeeNumber: true, firstName: true, middleName: true, lastName: true } },
  approvedBy: { select: { employeeNumber: true, firstName: true, middleName: true, lastName: true } },
} as const

/** The PositionLevel.code this codebase treats as "the single head of the
 *  whole bank" — same convention as MANAGING_DIRECTOR_LEVEL_CODE in
 *  admin-eligibility.util.ts and DIRECTOR_LEVEL_CODE in
 *  positions.service.ts. The Director is deliberately never granted
 *  isAdmin (see that constant's doc comment), so approve()/reject() below
 *  check for it explicitly alongside isAdmin. */
const DIRECTOR_LEVEL_CODE = "E1"

/** All 12 tracked stages, in workflow order — see the schema's module doc
 *  comment on RecruitmentStageName. */
const ALL_STAGES: RecruitmentStageName[] = [
  "WORKFORCE_PLANNING",
  "JOB_REQUISITION",
  "JOB_DESCRIPTION",
  "APPROVAL",
  "JOB_POSTING",
  "APPLICATIONS",
  "SCREENING",
  "ASSESSMENT",
  "INTERVIEWS",
  "BACKGROUND_CHECK",
  "OFFER",
  "ONBOARDING",
]

export interface RequisitionFilters {
  departmentId?: string
  branchId?: string
  status?: string
  recruiterId?: string
}

@Injectable()
export class RequisitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: RecruitmentAccessService,
    private readonly positionsService: PositionsService
  ) {}

  private buildWhere(filters: RequisitionFilters, scope: RecruitmentAccessScope): Prisma.JobRequisitionWhereInput {
    const accessWhere = this.accessService.buildRequisitionWhere(scope)
    const filterWhere: Prisma.JobRequisitionWhereInput = {
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.status ? { status: filters.status as RequisitionStatus } : {}),
      ...(filters.recruiterId ? { recruiterId: filters.recruiterId } : {}),
    }
    if (scope.allowAll) return filterWhere
    return { AND: [accessWhere, filterWhere] }
  }

  async findAll(filters: RequisitionFilters, actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    return this.prisma.jobRequisition.findMany({
      where: this.buildWhere(filters, scope),
      include: REQUISITION_INCLUDE,
      orderBy: { createdAt: "desc" },
    })
  }

  async findAllPaginated(
    filters: RequisitionFilters,
    actingEmployeeId: string,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResult<unknown>> {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    const where = this.buildWhere(filters, scope)
    const { skip, take, page: normalizedPage, pageSize: normalizedPageSize } = normalizePagination(page, pageSize)

    const [data, total] = await Promise.all([
      this.prisma.jobRequisition.findMany({ where, include: REQUISITION_INCLUDE, orderBy: { createdAt: "desc" }, skip, take }),
      this.prisma.jobRequisition.count({ where }),
    ])

    return buildPaginatedResult(data, total, normalizedPage, normalizedPageSize)
  }

  async findOne(id: string, actingEmployeeId: string) {
    const requisition = await this.prisma.jobRequisition.findUnique({ where: { id }, include: REQUISITION_INCLUDE })
    if (!requisition) {
      throw new NotFoundException(`Job requisition ${id} not found`)
    }
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (!this.accessService.canAccessRequisition(scope, requisition)) {
      throw new ForbiddenException("You don't have access to this job requisition")
    }
    return requisition
  }

  /** Raised by a Head of Department (or HR admin) from an existing/vacant
   *  position or a brand-new one. Creates a DRAFT; submit() sends it to HR. */
  async create(dto: CreateRequisitionDto, actingEmployeeId: string, options: { trustedScope?: boolean } = {}) {
    if (!dto.positionId && !dto.newPosition) {
      throw new BadRequestException("Provide either an existing positionId or a newPosition to create.")
    }
    if (dto.positionId && dto.newPosition) {
      throw new BadRequestException("Provide only one of positionId or newPosition, not both.")
    }

    const scope = await this.accessService.resolveScope(actingEmployeeId)
    const trusted = options.trustedScope === true // caller (department dashboard) already verified head-of-department access
    if (!trusted && !scope.allowAll && scope.departmentIds.length === 0) {
      throw new ForbiddenException("Only a Head of Department or an HR administrator can raise a job requisition.")
    }

    const targetDepartmentId = dto.positionId
      ? (await this.prisma.position.findUnique({ where: { id: dto.positionId }, select: { departmentId: true } }))?.departmentId
      : dto.newPosition!.departmentId
    if (!trusted && !scope.allowAll && targetDepartmentId && !scope.departmentIds.includes(targetDepartmentId)) {
      throw new ForbiddenException("You can only raise requisitions for positions in the department you head.")
    }

    if (dto.workforcePlanId) {
      const plan = await this.prisma.workforcePlan.findUnique({ where: { id: dto.workforcePlanId } })
      if (!plan) throw new NotFoundException(`Workforce plan ${dto.workforcePlanId} not found`)
    }

    const position = dto.positionId
      ? await this.prisma.position.findUnique({ where: { id: dto.positionId } })
      : await this.positionsService.create({
          title: dto.newPosition!.title,
          departmentId: dto.newPosition!.departmentId,
          unitId: dto.newPosition!.unitId,
          levelId: dto.newPosition!.levelId,
          reportsToPositionId: dto.newPosition!.reportsToPositionId,
        })

    if (!position) {
      throw new NotFoundException(`Position ${dto.positionId} not found`)
    }

    const department = await this.prisma.department.findUnique({ where: { id: position.departmentId } })
    if (!department) {
      throw new NotFoundException(`Department ${position.departmentId} not found`)
    }

    const bandId = dto.bandId ?? (await this.defaultBandId(position.id))
    await this.assertBandExists(bandId)

    // recruiterId is a required snapshot; until HR picks the requisition up
    // in review, point it at an HR administrator (replaced by the reviewer).
    const recruiterId = await this.defaultRecruiterId(actingEmployeeId)

    const requisition = await this.prisma.$transaction(async (tx) => {
      const created = await tx.jobRequisition.create({
        data: {
          workforcePlanId: dto.workforcePlanId ?? null,
          positionId: position.id,
          departmentId: position.departmentId,
          unitId: position.unitId,
          functionId: department.functionId,
          bandId,
          reportsToPositionId: position.reportsToPositionId,
          numberOfVacancies: dto.numberOfVacancies,
          contractType: dto.contractType,
          branchId: dto.branchId,
          employmentType: dto.employmentType,
          hiringReason: dto.hiringReason,
          requestedById: dto.requestedById ?? actingEmployeeId,
          hiringManagerId: dto.hiringManagerId ?? actingEmployeeId,
          recruiterId,
          priority: dto.priority,
          targetStartDate: dto.targetStartDate,
          jobDescriptionId: dto.jobDescriptionId,
          justification: dto.justification,
        },
        include: REQUISITION_INCLUDE,
      })

      await tx.recruitmentStageInstance.createMany({
        data: ALL_STAGES.map((stage) => ({ requisitionId: created.id, stage })),
      })

      return created
    })

    await this.log(requisition.id, "CREATED", actingEmployeeId)
    return requisition
  }

  private async defaultBandId(positionId: string): Promise<string> {
    const holder = await this.prisma.employee.findFirst({ where: { positionId, bandId: { not: null } }, select: { bandId: true } })
    if (holder?.bandId) return holder.bandId
    const lowest = await this.prisma.band.findFirst({ orderBy: { rank: "asc" }, select: { id: true } })
    if (!lowest) throw new BadRequestException("No bands are configured; create a band first.")
    return lowest.id
  }

  private async defaultRecruiterId(fallback: string): Promise<string> {
    const admin = await this.prisma.employee.findFirst({ where: { isAdmin: true }, select: { employeeNumber: true }, orderBy: { employeeNumber: "asc" } })
    return admin?.employeeNumber ?? fallback
  }

  async update(id: string, dto: UpdateRequisitionDto, actingEmployeeId: string) {
    const requisition = await this.findOne(id, actingEmployeeId)
    if (!["DRAFT", "REJECTED", "PENDING_HR_REVIEW"].includes(requisition.status) && requisition.status !== "APPROVED") {
      throw new BadRequestException("A requisition awaiting MD approval or already closed can't be edited.")
    }
    if (dto.bandId) {
      await this.assertBandExists(dto.bandId)
    }
    const updated = await this.prisma.jobRequisition.update({ where: { id }, data: dto, include: REQUISITION_INCLUDE })
    await this.log(id, "UPDATED", actingEmployeeId)
    return updated
  }

  /** Only a DRAFT requisition can be deleted outright — anything past that
   *  has an approval decision, possibly job postings/applications, and
   *  RecruitmentAuditLog history attached, so per the spec's audit-trail
   *  requirements it's closed (see close()/reopen()) rather than erased.
   *  A DRAFT requisition still always carries its 12 seeded
   *  RecruitmentStageInstance rows (see create()'s doc comment) and any
   *  audit log entries logged so far, so those are deleted first in the
   *  same transaction to satisfy the FK constraint. */
  async remove(id: string, actingEmployeeId: string) {
    const requisition = await this.findOne(id, actingEmployeeId)
    if (requisition.status !== "DRAFT") {
      throw new BadRequestException("Only a draft requisition can be deleted — close it instead once it's past draft.")
    }
    const postingCount = await this.prisma.jobPosting.count({ where: { requisitionId: id } })
    if (postingCount > 0) {
      throw new BadRequestException("This requisition already has job postings attached and can't be deleted.")
    }
    await this.prisma.$transaction([
      this.prisma.recruitmentStageInstance.deleteMany({ where: { requisitionId: id } }),
      this.prisma.recruitmentAuditLog.deleteMany({ where: { entityType: "JobRequisition", entityId: id } }),
      this.prisma.jobRequisition.delete({ where: { id } }),
    ])
  }

  /** HoD (requester / dept head) or admin sends a DRAFT (or a returned
   *  REJECTED one, after edits) to HR for review. */
  async submit(id: string, dto: ActingEmployeeDto) {
    const own = await this.prisma.jobRequisition.findUnique({ where: { id }, select: { requestedById: true } })
    // The requester can always submit their own requisition; anyone else needs normal access.
    const requisition = own?.requestedById === dto.actingEmployeeId
      ? await this.prisma.jobRequisition.findUniqueOrThrow({ where: { id } })
      : await this.findOne(id, dto.actingEmployeeId)
    if (requisition.status !== "DRAFT" && requisition.status !== "REJECTED") {
      throw new BadRequestException("Only a draft or returned requisition can be submitted for HR review.")
    }
    const updated = await this.prisma.jobRequisition.update({
      where: { id },
      data: { status: RequisitionStatus.PENDING_HR_REVIEW, rejectionComment: null },
      include: REQUISITION_INCLUDE,
    })
    await this.log(id, "SUBMITTED", dto.actingEmployeeId)
    await this.notifyHr(updated, dto.actingEmployeeId)
    return updated
  }

  /** HR reviews, approves and forwards to the MD. */
  async hrApprove(id: string, dto: ReviewRequisitionDto) {
    await this.assertIsHr(dto.actingEmployeeId)
    const requisition = await this.prisma.jobRequisition.findUnique({ where: { id } })
    if (!requisition) throw new NotFoundException(`Job requisition ${id} not found`)
    if (requisition.status !== "PENDING_HR_REVIEW") {
      throw new BadRequestException("Only a requisition pending HR review can be forwarded.")
    }
    const updated = await this.prisma.jobRequisition.update({
      where: { id },
      data: {
        status: RequisitionStatus.PENDING_MD_APPROVAL,
        recruiterId: dto.actingEmployeeId,
        hrReviewedById: dto.actingEmployeeId,
        hrReviewedAt: new Date(),
        hrComment: dto.comment || null,
      },
      include: REQUISITION_INCLUDE,
    })
    await this.log(id, "HR_APPROVED", dto.actingEmployeeId, dto.comment)
    await this.notifyMd(updated)
    await this.notifyRequester(updated, "Requisition forwarded to the MD", `HR approved your requisition for ${updated.position.title} and forwarded it to the MD.`)
    return updated
  }

  /** HR sends the requisition back to the HoD with a reason. */
  async hrReject(id: string, dto: ReviewRequisitionDto) {
    await this.assertIsHr(dto.actingEmployeeId)
    if (!dto.comment?.trim()) throw new BadRequestException("A comment is required when returning a requisition.")
    const requisition = await this.prisma.jobRequisition.findUnique({ where: { id } })
    if (!requisition) throw new NotFoundException(`Job requisition ${id} not found`)
    if (requisition.status !== "PENDING_HR_REVIEW") {
      throw new BadRequestException("Only a requisition pending HR review can be returned.")
    }
    const updated = await this.prisma.jobRequisition.update({
      where: { id },
      data: {
        status: RequisitionStatus.REJECTED,
        rejectionComment: dto.comment,
        hrReviewedById: dto.actingEmployeeId,
        hrReviewedAt: new Date(),
        hrComment: dto.comment,
      },
      include: REQUISITION_INCLUDE,
    })
    await this.log(id, "HR_REJECTED", dto.actingEmployeeId, dto.comment)
    await this.notifyRequester(updated, "Requisition returned by HR", `Your requisition for ${updated.position.title} was returned: ${dto.comment}`)
    return updated
  }

  /** Final approval by the MD (Director-level position). */
  async approve(id: string, dto: ActingEmployeeDto) {
    await this.assertIsMd(dto.actingEmployeeId)
    const requisition = await this.prisma.jobRequisition.findUnique({ where: { id } })
    if (!requisition) {
      throw new NotFoundException(`Job requisition ${id} not found`)
    }
    if (requisition.status !== "PENDING_MD_APPROVAL" && requisition.status !== "PENDING_APPROVAL") {
      throw new BadRequestException("Only a requisition pending MD approval can be approved.")
    }
    const updated = await this.prisma.jobRequisition.update({
      where: { id },
      data: { status: RequisitionStatus.APPROVED, approvedById: dto.actingEmployeeId, approvedAt: new Date() },
      include: REQUISITION_INCLUDE,
    })
    await this.log(id, "APPROVED", dto.actingEmployeeId)
    await this.notifyDecision(updated, `The MD approved the requisition for ${updated.position.title}.`, "Requisition approved by the MD")
    return updated
  }

  async reject(id: string, dto: RejectRequisitionDto) {
    await this.assertIsMd(dto.actingEmployeeId)
    const requisition = await this.prisma.jobRequisition.findUnique({ where: { id } })
    if (!requisition) {
      throw new NotFoundException(`Job requisition ${id} not found`)
    }
    if (requisition.status !== "PENDING_MD_APPROVAL" && requisition.status !== "PENDING_APPROVAL") {
      throw new BadRequestException("Only a requisition pending MD approval can be rejected.")
    }
    const updated = await this.prisma.jobRequisition.update({
      where: { id },
      data: { status: RequisitionStatus.REJECTED, rejectionComment: dto.rejectionComment },
      include: REQUISITION_INCLUDE,
    })
    await this.log(id, "REJECTED", dto.actingEmployeeId, dto.rejectionComment)
    await this.notifyDecision(updated, `The MD rejected the requisition for ${updated.position.title}: ${dto.rejectionComment}`, "Requisition rejected by the MD")
    return updated
  }

  async close(id: string, dto: ActingEmployeeDto) {
    const requisition = await this.findOne(id, dto.actingEmployeeId)
    if (requisition.status !== "APPROVED") {
      throw new BadRequestException("Only an approved requisition can be closed.")
    }
    const updated = await this.prisma.jobRequisition.update({
      where: { id },
      data: { status: RequisitionStatus.CLOSED },
      include: REQUISITION_INCLUDE,
    })
    await this.log(id, "CLOSED", dto.actingEmployeeId)
    return updated
  }

  /** Reverses close() — puts a closed requisition back to APPROVED so
   *  recruiting can resume against it (e.g. it was closed too early, or the
   *  hire fell through). Deliberately symmetric with close()'s own
   *  precondition: only ever CLOSED -> APPROVED, never used to resurrect a
   *  REJECTED requisition (that has its own, separate lifecycle). */
  async reopen(id: string, dto: ActingEmployeeDto) {
    const requisition = await this.findOne(id, dto.actingEmployeeId)
    if (requisition.status !== "CLOSED") {
      throw new BadRequestException("Only a closed requisition can be reopened.")
    }
    const updated = await this.prisma.jobRequisition.update({
      where: { id },
      data: { status: RequisitionStatus.APPROVED },
      include: REQUISITION_INCLUDE,
    })
    await this.log(id, "REOPENED", dto.actingEmployeeId)
    return updated
  }

  async getStages(requisitionId: string, actingEmployeeId: string) {
    await this.findOne(requisitionId, actingEmployeeId)
    return this.prisma.recruitmentStageInstance.findMany({
      where: { requisitionId },
      include: { owner: { select: { employeeNumber: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "asc" },
    })
  }

  async updateStage(requisitionId: string, stage: RecruitmentStageName, dto: UpdateStageDto) {
    await this.findOne(requisitionId, dto.actingEmployeeId)
    const { actingEmployeeId, ...fields } = dto
    const updated = await this.prisma.recruitmentStageInstance.update({
      where: { requisitionId_stage: { requisitionId, stage } },
      data: fields,
      include: { owner: { select: { employeeNumber: true, firstName: true, lastName: true } } },
    })
    await this.log(requisitionId, "STAGE_UPDATED", actingEmployeeId, stage)
    return updated
  }

  private async assertBandExists(bandId: string) {
    const band = await this.prisma.band.findUnique({ where: { id: bandId } })
    if (!band) {
      throw new NotFoundException(`Band ${bandId} not found`)
    }
  }

  // ---- Notifications ----------------------------------------------------
  private async notify(recipientIds: string[], title: string, message: string, actionUrl: string, type: "REQUISITION_SUBMITTED" | "REQUISITION_FORWARDED" | "REQUISITION_DECISION") {
    const ids = [...new Set(recipientIds)].filter(Boolean)
    if (ids.length === 0) return
    try {
      await this.prisma.notification.createMany({
        data: ids.map((recipientEmployeeId) => ({ recipientEmployeeId, type, title, message, actionUrl })),
      })
    } catch {
      // A notification failure must never block the approval workflow.
    }
  }

  private async hrAdminIds() {
    const admins = await this.prisma.employee.findMany({ where: { isAdmin: true, isActive: true }, select: { employeeNumber: true } })
    return admins.map((a) => a.employeeNumber)
  }

  private async mdIds() {
    const mds = await this.prisma.employee.findMany({
      where: { isActive: true, position: { level: { code: DIRECTOR_LEVEL_CODE } } },
      select: { employeeNumber: true },
    })
    return mds.map((m) => m.employeeNumber)
  }

  private async notifyHr(r: { id: string; position: { title: string }; department: { name: string }; requestedBy: { firstName: string; lastName: string } }, actorId: string) {
    const hr = (await this.hrAdminIds()).filter((id) => id !== actorId)
    await this.notify(
      hr,
      "Requisition awaiting HR review",
      `${r.requestedBy.firstName} ${r.requestedBy.lastName} (${r.department.name}) requested a hire for ${r.position.title}.`,
      `/admin/recruitment/requisitions/${r.id}`,
      "REQUISITION_SUBMITTED"
    )
  }

  private async notifyMd(r: { id: string; position: { title: string }; department: { name: string } }) {
    await this.notify(
      await this.mdIds(),
      "Requisition awaiting your approval",
      `HR approved a requisition for ${r.position.title} (${r.department.name}) and forwarded it for your approval.`,
      `/staff/md/requisitions/${r.id}`,
      "REQUISITION_FORWARDED"
    )
  }

  private async notifyRequester(r: { id: string; requestedById: string }, title: string, message: string) {
    await this.notify([r.requestedById], title, message, `/staff/department-dashboard/requisitions`, "REQUISITION_DECISION")
  }

  /** MD decision → the requester (HoD) and the HR owner. */
  private async notifyDecision(r: { id: string; requestedById: string; recruiterId: string }, message: string, title: string) {
    await this.notify([r.requestedById], title, message, `/staff/department-dashboard/requisitions`, "REQUISITION_DECISION")
    await this.notify([r.recruiterId], title, message, `/admin/recruitment/requisitions/${r.id}`, "REQUISITION_DECISION")
  }

  private async assertIsHr(actingEmployeeId: string) {
    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: actingEmployeeId }, select: { isAdmin: true } })
    if (!actor?.isAdmin) throw new ForbiddenException("Only HR can review a job requisition.")
  }

  /** The MD is the Director-level (E1) position holder — deliberately not
   *  an admin (see DIRECTOR_LEVEL_CODE), so this checks the level only. */
  private async assertIsMd(actingEmployeeId: string) {
    const actor = await this.prisma.employee.findUnique({
      where: { employeeNumber: actingEmployeeId },
      select: { position: { select: { level: { select: { code: true } } } } },
    })
    if (actor?.position?.level?.code !== DIRECTOR_LEVEL_CODE) {
      throw new ForbiddenException("Only the Managing Director can approve or reject a job requisition.")
    }
  }

  private async log(id: string, action: string, actorId: string | null, notes?: string) {
    await this.prisma.recruitmentAuditLog.create({
      data: { entityType: "JobRequisition", entityId: id, action, actorId, notes: notes || null },
    })
  }
}
