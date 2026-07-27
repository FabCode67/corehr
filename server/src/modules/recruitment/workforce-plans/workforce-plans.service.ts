import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { Prisma, WorkforcePlanStatus } from "@prisma/client"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../../common/pagination"
import { PrismaService } from "../../../prisma/prisma.service"
import { RecruitmentAccessService } from "../access/recruitment-access.service"

import { ActingEmployeeDto } from "./dto/acting-employee.dto"
import { CreateWorkforcePlanDto } from "./dto/create-workforce-plan.dto"
import { RejectWorkforcePlanDto } from "./dto/reject-workforce-plan.dto"
import { UpdateWorkforcePlanDto } from "./dto/update-workforce-plan.dto"

export const WORKFORCE_PLAN_INCLUDE = {
  department: { select: { id: true, name: true } },
  unit: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  hiringManager: { select: { employeeNumber: true, firstName: true, lastName: true } },
  recruiter: { select: { employeeNumber: true, firstName: true, lastName: true } },
  approvedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
} as const

export interface WorkforcePlanFilters {
  departmentId?: string
  branchId?: string
  status?: string
}

@Injectable()
export class WorkforcePlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: RecruitmentAccessService
  ) {}

  private buildWhere(filters: WorkforcePlanFilters, scope: Awaited<ReturnType<RecruitmentAccessService["resolveScope"]>>): Prisma.WorkforcePlanWhereInput {
    const accessWhere = this.accessService.buildWorkforcePlanWhere(scope)
    const filterWhere: Prisma.WorkforcePlanWhereInput = {
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.status ? { status: filters.status as WorkforcePlanStatus } : {}),
    }
    if (scope.allowAll) return filterWhere
    return { AND: [accessWhere, filterWhere] }
  }

  async findAll(filters: WorkforcePlanFilters, actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    return this.prisma.workforcePlan.findMany({
      where: this.buildWhere(filters, scope),
      include: WORKFORCE_PLAN_INCLUDE,
      orderBy: { createdAt: "desc" },
    })
  }

  async findAllPaginated(
    filters: WorkforcePlanFilters,
    actingEmployeeId: string,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResult<unknown>> {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    const where = this.buildWhere(filters, scope)
    const { skip, take, page: normalizedPage, pageSize: normalizedPageSize } = normalizePagination(page, pageSize)

    const [data, total] = await Promise.all([
      this.prisma.workforcePlan.findMany({
        where,
        include: WORKFORCE_PLAN_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.workforcePlan.count({ where }),
    ])

    return buildPaginatedResult(data, total, normalizedPage, normalizedPageSize)
  }

  async findOne(id: string, actingEmployeeId: string) {
    const plan = await this.prisma.workforcePlan.findUnique({ where: { id }, include: WORKFORCE_PLAN_INCLUDE })
    if (!plan) {
      throw new NotFoundException(`Workforce plan ${id} not found`)
    }

    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (
      !scope.allowAll &&
      plan.recruiterId !== actingEmployeeId &&
      plan.hiringManagerId !== actingEmployeeId &&
      !scope.departmentIds.includes(plan.departmentId)
    ) {
      throw new ForbiddenException("You don't have access to this workforce plan")
    }

    return plan
  }

  async create(dto: CreateWorkforcePlanDto, actingEmployeeId: string) {
    const plan = await this.prisma.workforcePlan.create({ data: dto, include: WORKFORCE_PLAN_INCLUDE })
    await this.log(plan.id, "CREATED", actingEmployeeId)
    return plan
  }

  async update(id: string, dto: UpdateWorkforcePlanDto, actingEmployeeId: string) {
    const plan = await this.findOne(id, actingEmployeeId)
    if (plan.status === "APPROVED") {
      throw new BadRequestException("An approved workforce plan can no longer be edited.")
    }
    const updated = await this.prisma.workforcePlan.update({ where: { id }, data: dto, include: WORKFORCE_PLAN_INCLUDE })
    await this.log(id, "UPDATED", actingEmployeeId)
    return updated
  }

  async submit(id: string, dto: ActingEmployeeDto) {
    const plan = await this.findOne(id, dto.actingEmployeeId)
    if (plan.status !== "DRAFT") {
      throw new BadRequestException("Only a draft workforce plan can be submitted for approval.")
    }
    const updated = await this.prisma.workforcePlan.update({
      where: { id },
      data: { status: WorkforcePlanStatus.PENDING_APPROVAL },
      include: WORKFORCE_PLAN_INCLUDE,
    })
    await this.log(id, "SUBMITTED", dto.actingEmployeeId)
    return updated
  }

  async approve(id: string, dto: ActingEmployeeDto) {
    await this.assertIsAdmin(dto.actingEmployeeId)
    const plan = await this.prisma.workforcePlan.findUnique({ where: { id } })
    if (!plan) {
      throw new NotFoundException(`Workforce plan ${id} not found`)
    }
    if (plan.status !== "PENDING_APPROVAL") {
      throw new BadRequestException("Only a plan pending approval can be approved.")
    }
    const updated = await this.prisma.workforcePlan.update({
      where: { id },
      data: { status: WorkforcePlanStatus.APPROVED, approvedById: dto.actingEmployeeId, approvedAt: new Date() },
      include: WORKFORCE_PLAN_INCLUDE,
    })
    await this.log(id, "APPROVED", dto.actingEmployeeId)
    return updated
  }

  async reject(id: string, dto: RejectWorkforcePlanDto) {
    await this.assertIsAdmin(dto.actingEmployeeId)
    const plan = await this.prisma.workforcePlan.findUnique({ where: { id } })
    if (!plan) {
      throw new NotFoundException(`Workforce plan ${id} not found`)
    }
    if (plan.status !== "PENDING_APPROVAL") {
      throw new BadRequestException("Only a plan pending approval can be rejected.")
    }
    const updated = await this.prisma.workforcePlan.update({
      where: { id },
      data: { status: WorkforcePlanStatus.REJECTED, rejectionComment: dto.rejectionComment },
      include: WORKFORCE_PLAN_INCLUDE,
    })
    await this.log(id, "REJECTED", dto.actingEmployeeId, dto.rejectionComment)
    return updated
  }

  private async assertIsAdmin(actingEmployeeId: string) {
    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: actingEmployeeId } })
    if (!actor?.isAdmin) {
      throw new ForbiddenException("Only an HR administrator can perform this action")
    }
  }

  private async log(id: string, action: string, actorId: string | null, notes?: string) {
    await this.prisma.recruitmentAuditLog.create({
      data: { entityType: "WorkforcePlan", entityId: id, action, actorId, notes: notes || null },
    })
  }
}
