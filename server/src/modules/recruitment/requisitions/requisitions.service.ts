import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { Prisma, RecruitmentStageName, RequisitionStatus } from "@prisma/client"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../../common/pagination"
import { PrismaService } from "../../../prisma/prisma.service"
import { PositionsService } from "../../organization/positions/positions.service"
import { RecruitmentAccessScope, RecruitmentAccessService } from "../access/recruitment-access.service"

import { ActingEmployeeDto } from "./dto/acting-employee.dto"
import { CreateRequisitionDto } from "./dto/create-requisition.dto"
import { RejectRequisitionDto } from "./dto/reject-requisition.dto"
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
  requestedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
  hiringManager: { select: { employeeNumber: true, firstName: true, lastName: true } },
  recruiter: { select: { employeeNumber: true, firstName: true, lastName: true } },
  approvedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
} as const

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

  /** Selects (or creates) the Position, snapshots its org context, creates
   *  the JobRequisition, and seeds all 12 RecruitmentStageInstance rows so
   *  the full planned timeline exists immediately — see module doc comment
   *  on RecruitmentStageInstance. */
  async create(dto: CreateRequisitionDto, actingEmployeeId: string) {
    if (!dto.positionId && !dto.newPosition) {
      throw new BadRequestException("Provide either an existing positionId or a newPosition to create.")
    }
    if (dto.positionId && dto.newPosition) {
      throw new BadRequestException("Provide only one of positionId or newPosition, not both.")
    }

    const plan = await this.prisma.workforcePlan.findUnique({ where: { id: dto.workforcePlanId } })
    if (!plan) {
      throw new NotFoundException(`Workforce plan ${dto.workforcePlanId} not found`)
    }
    if (plan.status !== "APPROVED") {
      throw new BadRequestException("The workforce plan must be approved before a requisition can be created against it.")
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

    await this.assertBandExists(dto.bandId)

    const requisition = await this.prisma.$transaction(async (tx) => {
      const created = await tx.jobRequisition.create({
        data: {
          workforcePlanId: dto.workforcePlanId,
          positionId: position.id,
          departmentId: position.departmentId,
          unitId: position.unitId,
          functionId: department.functionId,
          bandId: dto.bandId,
          reportsToPositionId: position.reportsToPositionId,
          numberOfVacancies: dto.numberOfVacancies,
          contractType: dto.contractType,
          branchId: dto.branchId,
          employmentType: dto.employmentType,
          hiringReason: dto.hiringReason,
          requestedById: dto.requestedById,
          hiringManagerId: dto.hiringManagerId,
          recruiterId: plan.recruiterId,
          priority: dto.priority,
          targetStartDate: dto.targetStartDate,
          jobDescriptionId: dto.jobDescriptionId,
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

  async update(id: string, dto: UpdateRequisitionDto, actingEmployeeId: string) {
    const requisition = await this.findOne(id, actingEmployeeId)
    if (requisition.status === "CLOSED") {
      throw new BadRequestException("A closed requisition can no longer be edited.")
    }
    const updated = await this.prisma.jobRequisition.update({ where: { id }, data: dto, include: REQUISITION_INCLUDE })
    await this.log(id, "UPDATED", actingEmployeeId)
    return updated
  }

  async submit(id: string, dto: ActingEmployeeDto) {
    const requisition = await this.findOne(id, dto.actingEmployeeId)
    if (requisition.status !== "DRAFT") {
      throw new BadRequestException("Only a draft requisition can be submitted for approval.")
    }
    const updated = await this.prisma.jobRequisition.update({
      where: { id },
      data: { status: RequisitionStatus.PENDING_APPROVAL },
      include: REQUISITION_INCLUDE,
    })
    await this.log(id, "SUBMITTED", dto.actingEmployeeId)
    return updated
  }

  async approve(id: string, dto: ActingEmployeeDto) {
    await this.assertIsAdmin(dto.actingEmployeeId)
    const requisition = await this.prisma.jobRequisition.findUnique({ where: { id } })
    if (!requisition) {
      throw new NotFoundException(`Job requisition ${id} not found`)
    }
    if (requisition.status !== "PENDING_APPROVAL") {
      throw new BadRequestException("Only a requisition pending approval can be approved.")
    }
    const updated = await this.prisma.jobRequisition.update({
      where: { id },
      data: { status: RequisitionStatus.APPROVED, approvedById: dto.actingEmployeeId, approvedAt: new Date() },
      include: REQUISITION_INCLUDE,
    })
    await this.log(id, "APPROVED", dto.actingEmployeeId)
    return updated
  }

  async reject(id: string, dto: RejectRequisitionDto) {
    await this.assertIsAdmin(dto.actingEmployeeId)
    const requisition = await this.prisma.jobRequisition.findUnique({ where: { id } })
    if (!requisition) {
      throw new NotFoundException(`Job requisition ${id} not found`)
    }
    if (requisition.status !== "PENDING_APPROVAL") {
      throw new BadRequestException("Only a requisition pending approval can be rejected.")
    }
    const updated = await this.prisma.jobRequisition.update({
      where: { id },
      data: { status: RequisitionStatus.REJECTED, rejectionComment: dto.rejectionComment },
      include: REQUISITION_INCLUDE,
    })
    await this.log(id, "REJECTED", dto.actingEmployeeId, dto.rejectionComment)
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

  private async assertIsAdmin(actingEmployeeId: string) {
    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: actingEmployeeId } })
    if (!actor?.isAdmin) {
      throw new ForbiddenException("Only an HR administrator can perform this action")
    }
  }

  private async log(id: string, action: string, actorId: string | null, notes?: string) {
    await this.prisma.recruitmentAuditLog.create({
      data: { entityType: "JobRequisition", entityId: id, action, actorId, notes: notes || null },
    })
  }
}
