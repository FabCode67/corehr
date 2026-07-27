import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { ContractType, Gender, PerformanceReviewStatus, PerformanceReviewType, Prisma } from "@prisma/client"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../../common/pagination"
import { PrismaService } from "../../../prisma/prisma.service"
import { EmployeesService } from "../../employees/employees.service"
import { PerformanceAccessService } from "../access/performance-access.service"
import { ReviewPeriodsService } from "../review-periods/review-periods.service"

import { AcknowledgeReviewDto } from "./dto/acknowledge-review.dto"
import { CreateReviewDto } from "./dto/create-review.dto"
import { FinalizeReviewDto } from "./dto/finalize-review.dto"
import { ReassignReviewerDto } from "./dto/reassign-reviewer.dto"
import { SubmitReviewDto } from "./dto/submit-review.dto"
import { UpdateReviewDto } from "./dto/update-review.dto"

const REVIEW_INCLUDE = {
  period: true,
  employee: { select: { employeeNumber: true, firstName: true, lastName: true, profilePictureUrl: true } },
  reviewer: { select: { employeeNumber: true, firstName: true, lastName: true } },
  department: true,
  unit: true,
  position: { select: { id: true, title: true } },
  level: true,
  band: true,
  branch: true,
} as const

const REVIEW_LIST_INCLUDE = {
  ...REVIEW_INCLUDE,
  auditLogs: false,
} as const

export interface ReviewFilters {
  periodId?: string
  reviewType?: PerformanceReviewType
  status?: string
  employeeId?: string
  departmentId?: string
  unitId?: string
  branchId?: string
  positionId?: string
  levelId?: string
  bandId?: string
  contractType?: string
  gender?: string
}

/**
 * Core review workflow: DRAFT (manager filling in, autosaved) -> SUBMITTED
 * (manager done) -> ACKNOWLEDGED (employee has seen it / added comments,
 * optional) -> FINALIZED (HR locks it into permanent history). Every
 * transition is written to PerformanceAuditLog. Org-context fields are
 * snapshotted once at creation — see the schema's design note for why.
 */
@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: PerformanceAccessService,
    private readonly reviewPeriodsService: ReviewPeriodsService,
    private readonly employeesService: EmployeesService
  ) {}

  async findAllPaginated(filters: ReviewFilters, actingEmployeeId: string, page?: number, pageSize?: number): Promise<PaginatedResult<unknown>> {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    const where = this.buildWhere(filters, scope)
    const { skip, take, page: normalizedPage, pageSize: normalizedPageSize } = normalizePagination(page, pageSize)

    const [data, total] = await Promise.all([
      this.prisma.performanceReview.findMany({
        where,
        include: REVIEW_LIST_INCLUDE,
        orderBy: [{ period: { year: "desc" } }, { createdAt: "desc" }],
        skip,
        take,
      }),
      this.prisma.performanceReview.count({ where }),
    ])

    return buildPaginatedResult(data, total, normalizedPage, normalizedPageSize)
  }

  findAll(filters: ReviewFilters, actingEmployeeId: string) {
    return this.findAllUnpaginated(filters, actingEmployeeId)
  }

  private async findAllUnpaginated(filters: ReviewFilters, actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    const where = this.buildWhere(filters, scope)

    return this.prisma.performanceReview.findMany({
      where,
      include: REVIEW_LIST_INCLUDE,
      orderBy: [{ period: { year: "desc" } }, { createdAt: "desc" }],
    })
  }

  async findOne(id: string, actingEmployeeId: string) {
    const review = await this.prisma.performanceReview.findUnique({
      where: { id },
      include: { ...REVIEW_INCLUDE, auditLogs: { orderBy: { createdAt: "desc" }, include: { actor: { select: { firstName: true, lastName: true } } } } },
    })

    if (!review) {
      throw new NotFoundException(`Performance review ${id} not found`)
    }

    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (!this.accessService.canAccessEmployee(scope, review.employeeId, review.departmentId)) {
      throw new ForbiddenException("You don't have access to this review")
    }

    return review
  }

  /** All reviews for one employee, newest first — the "Performance History" view. Never overwritten; every row is permanent. */
  async historyForEmployee(employeeId: string, actingEmployeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNumber: employeeId },
      select: { employeeNumber: true, position: { select: { departmentId: true } } },
    })
    if (!employee) {
      throw new NotFoundException(`Employee ${employeeId} not found`)
    }

    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (!this.accessService.canAccessEmployee(scope, employeeId, employee.position?.departmentId ?? null)) {
      throw new ForbiddenException("You don't have access to this employee's performance history")
    }

    return this.prisma.performanceReview.findMany({
      where: { employeeId },
      include: REVIEW_INCLUDE,
      orderBy: [{ period: { year: "desc" } }, { reviewType: "asc" }],
    })
  }

  async create(dto: CreateReviewDto) {
    const scope = await this.accessService.resolveScope(dto.actingEmployeeId)

    const employee = await this.prisma.employee.findUnique({
      where: { employeeNumber: dto.employeeId },
      include: { position: { include: { department: true, unit: true, level: true } }, band: true, branch: true },
    })
    if (!employee) {
      throw new NotFoundException(`Employee ${dto.employeeId} not found`)
    }

    if (!this.accessService.canAccessEmployee(scope, dto.employeeId, employee.position?.departmentId ?? null)) {
      throw new ForbiddenException("You don't have access to create a review for this employee")
    }

    await this.reviewPeriodsService.assertCycleOpen(dto.periodId, dto.reviewType)

    let reviewerId = dto.reviewerId ?? dto.actingEmployeeId
    if (!dto.reviewerId) {
      const resolved = await this.employeesService.getReportingManager(dto.employeeId)
      reviewerId = resolved.manager?.id ?? dto.actingEmployeeId
    }

    const existing = await this.prisma.performanceReview.findUnique({
      where: {
        periodId_employeeId_reviewType: { periodId: dto.periodId, employeeId: dto.employeeId, reviewType: dto.reviewType },
      },
    })
    if (existing) {
      throw new BadRequestException("A review of this type already exists for this employee in this period")
    }

    const review = await this.prisma.performanceReview.create({
      data: {
        periodId: dto.periodId,
        employeeId: dto.employeeId,
        reviewType: dto.reviewType,
        reviewerId,
        departmentId: employee.position?.departmentId ?? null,
        unitId: employee.position?.unitId ?? null,
        positionId: employee.positionId,
        levelId: employee.position?.levelId ?? null,
        bandId: employee.bandId,
        branchId: employee.branchId,
        contractType: employee.contractType,
        gender: employee.gender,
      },
      include: REVIEW_INCLUDE,
    })

    await this.log(review.id, "CREATED", dto.actingEmployeeId)
    return review
  }

  async update(id: string, dto: UpdateReviewDto) {
    const review = await this.getWithAccessCheck(id, dto.actingEmployeeId, { requireEditor: true })

    const { actingEmployeeId, ...fields } = dto
    const updated = await this.prisma.performanceReview.update({
      where: { id },
      data: fields,
      include: REVIEW_INCLUDE,
    })

    await this.log(id, "UPDATED", actingEmployeeId, Object.keys(fields).join(", "))
    return updated
  }

  async submit(id: string, dto: SubmitReviewDto) {
    const review = await this.getWithAccessCheck(id, dto.actingEmployeeId, { requireEditor: true })

    if (review.status !== "DRAFT") {
      throw new BadRequestException("Only a draft review can be submitted")
    }
    if (!review.overallRating) {
      throw new BadRequestException("An overall rating is required before submitting")
    }

    const updated = await this.prisma.performanceReview.update({
      where: { id },
      data: { status: "SUBMITTED", submittedAt: new Date() },
      include: REVIEW_INCLUDE,
    })

    await this.log(id, "SUBMITTED", dto.actingEmployeeId)
    return updated
  }

  async acknowledge(id: string, dto: AcknowledgeReviewDto) {
    const review = await this.prisma.performanceReview.findUnique({ where: { id } })
    if (!review) {
      throw new NotFoundException(`Performance review ${id} not found`)
    }

    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: dto.actingEmployeeId } })
    if (!actor) {
      throw new NotFoundException(`Employee ${dto.actingEmployeeId} not found`)
    }
    if (review.employeeId !== dto.actingEmployeeId && !actor.isAdmin) {
      throw new ForbiddenException("Only the reviewed employee can acknowledge this review")
    }
    if (review.status !== "SUBMITTED") {
      throw new BadRequestException("Only a submitted review can be acknowledged")
    }

    const updated = await this.prisma.performanceReview.update({
      where: { id },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedAt: new Date(),
        ...(dto.employeeComments !== undefined ? { employeeComments: dto.employeeComments } : {}),
      },
      include: REVIEW_INCLUDE,
    })

    await this.log(id, "ACKNOWLEDGED", dto.actingEmployeeId)
    return updated
  }

  async finalize(id: string, dto: FinalizeReviewDto) {
    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: dto.actingEmployeeId } })
    if (!actor?.isAdmin) {
      throw new ForbiddenException("Only an HR administrator can finalize a review")
    }

    const review = await this.prisma.performanceReview.findUnique({ where: { id } })
    if (!review) {
      throw new NotFoundException(`Performance review ${id} not found`)
    }
    if (review.status === "FINALIZED") {
      throw new BadRequestException("This review has already been finalized")
    }
    if (review.status === "DRAFT") {
      throw new BadRequestException("A draft review must be submitted before it can be finalized")
    }

    const updated = await this.prisma.performanceReview.update({
      where: { id },
      data: {
        status: "FINALIZED",
        finalizedAt: new Date(),
        ...(dto.hrComments !== undefined ? { hrComments: dto.hrComments } : {}),
      },
      include: REVIEW_INCLUDE,
    })

    await this.log(id, "FINALIZED", dto.actingEmployeeId)
    return updated
  }

  async reassignReviewer(id: string, dto: ReassignReviewerDto) {
    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: dto.actingEmployeeId } })
    if (!actor?.isAdmin) {
      throw new ForbiddenException("Only an HR administrator can reassign a reviewer")
    }

    const review = await this.prisma.performanceReview.findUnique({ where: { id } })
    if (!review) {
      throw new NotFoundException(`Performance review ${id} not found`)
    }

    const newReviewer = await this.prisma.employee.findUnique({ where: { employeeNumber: dto.reviewerId } })
    if (!newReviewer) {
      throw new NotFoundException(`Employee ${dto.reviewerId} not found`)
    }

    const updated = await this.prisma.performanceReview.update({
      where: { id },
      data: { reviewerId: dto.reviewerId },
      include: REVIEW_INCLUDE,
    })

    await this.log(id, "REASSIGNED", dto.actingEmployeeId, `New reviewer: ${newReviewer.firstName} ${newReviewer.lastName}`)
    return updated
  }

  private async getWithAccessCheck(id: string, actingEmployeeId: string, opts: { requireEditor: boolean }) {
    const review = await this.prisma.performanceReview.findUnique({ where: { id } })
    if (!review) {
      throw new NotFoundException(`Performance review ${id} not found`)
    }

    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: actingEmployeeId } })
    if (!actor) {
      throw new NotFoundException(`Employee ${actingEmployeeId} not found`)
    }

    if (opts.requireEditor) {
      const isOwner = review.reviewerId === actingEmployeeId
      if (!actor.isAdmin && !isOwner) {
        throw new ForbiddenException("Only the assigned reviewer or an HR administrator can edit this review")
      }
      if (review.status === "FINALIZED" && !actor.isAdmin) {
        throw new ForbiddenException("This review has been finalized and can no longer be edited")
      }
    }

    return review
  }

  private buildWhere(filters: ReviewFilters, scope: Awaited<ReturnType<PerformanceAccessService["resolveScope"]>>): Prisma.PerformanceReviewWhereInput {
    const accessWhere = this.accessService.buildReviewWhere(scope)

    const filterWhere: Prisma.PerformanceReviewWhereInput = {
      ...(filters.periodId ? { periodId: filters.periodId } : {}),
      ...(filters.reviewType ? { reviewType: filters.reviewType as PerformanceReviewType } : {}),
      ...(filters.status ? { status: filters.status as PerformanceReviewStatus } : {}),
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.unitId ? { unitId: filters.unitId } : {}),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.positionId ? { positionId: filters.positionId } : {}),
      ...(filters.levelId ? { levelId: filters.levelId } : {}),
      ...(filters.bandId ? { bandId: filters.bandId } : {}),
      ...(filters.contractType ? { contractType: filters.contractType as ContractType } : {}),
      ...(filters.gender ? { gender: filters.gender as Gender } : {}),
    }

    if (scope.allowAll) return filterWhere
    return { AND: [accessWhere, filterWhere] }
  }

  private async log(reviewId: string, action: string, actorId: string, notes?: string) {
    await this.prisma.performanceAuditLog.create({
      data: { reviewId, action, actorId, notes: notes || null },
    })
  }
}
