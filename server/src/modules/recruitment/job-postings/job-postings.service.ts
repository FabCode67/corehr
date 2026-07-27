import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { JobPostingStatus, Prisma } from "@prisma/client"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../../common/pagination"
import { PrismaService } from "../../../prisma/prisma.service"
import { RecruitmentAccessScope, RecruitmentAccessService } from "../access/recruitment-access.service"

import { ActingEmployeeDto } from "./dto/acting-employee.dto"
import { CreateJobPostingDto } from "./dto/create-job-posting.dto"
import { UpdateJobPostingDto } from "./dto/update-job-posting.dto"

const JOB_POSTING_INCLUDE = {
  requisition: {
    select: {
      id: true,
      recruiterId: true,
      hiringManagerId: true,
      departmentId: true,
      position: { select: { id: true, title: true } },
    },
  },
  branch: { select: { id: true, name: true } },
  _count: { select: { applications: true } },
} as const

export interface JobPostingFilters {
  status?: string
  requisitionId?: string
  branchId?: string
}

@Injectable()
export class JobPostingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: RecruitmentAccessService
  ) {}

  private buildWhere(filters: JobPostingFilters, scope: RecruitmentAccessScope): Prisma.JobPostingWhereInput {
    const filterWhere: Prisma.JobPostingWhereInput = {
      ...(filters.status ? { status: filters.status as JobPostingStatus } : {}),
      ...(filters.requisitionId ? { requisitionId: filters.requisitionId } : {}),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
    }
    if (scope.allowAll) return filterWhere
    return { AND: [{ requisition: this.accessService.buildRequisitionWhere(scope) }, filterWhere] }
  }

  async findAll(filters: JobPostingFilters, actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    return this.prisma.jobPosting.findMany({
      where: this.buildWhere(filters, scope),
      include: JOB_POSTING_INCLUDE,
      orderBy: { createdAt: "desc" },
    })
  }

  async findAllPaginated(
    filters: JobPostingFilters,
    actingEmployeeId: string,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResult<unknown>> {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    const where = this.buildWhere(filters, scope)
    const { skip, take, page: normalizedPage, pageSize: normalizedPageSize } = normalizePagination(page, pageSize)

    const [data, total] = await Promise.all([
      this.prisma.jobPosting.findMany({ where, include: JOB_POSTING_INCLUDE, orderBy: { createdAt: "desc" }, skip, take }),
      this.prisma.jobPosting.count({ where }),
    ])

    return buildPaginatedResult(data, total, normalizedPage, normalizedPageSize)
  }

  /** Postings currently PUBLISHED and not past their closing date — used by
   *  the public/internal "browse open vacancies" list, no access scoping. */
  findAllOpen() {
    return this.prisma.jobPosting.findMany({
      where: { status: "PUBLISHED", closingDate: { gte: new Date() } },
      include: JOB_POSTING_INCLUDE,
      orderBy: { publishedAt: "desc" },
    })
  }

  async findOne(id: string, actingEmployeeId: string) {
    const posting = await this.prisma.jobPosting.findUnique({ where: { id }, include: JOB_POSTING_INCLUDE })
    if (!posting) {
      throw new NotFoundException(`Job posting ${id} not found`)
    }
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (!scope.allowAll && !this.accessService.canAccessRequisition(scope, posting.requisition)) {
      throw new ForbiddenException("You don't have access to this job posting")
    }
    return posting
  }

  async create(dto: CreateJobPostingDto, actingEmployeeId: string) {
    const requisition = await this.prisma.jobRequisition.findUnique({ where: { id: dto.requisitionId } })
    if (!requisition) {
      throw new NotFoundException(`Job requisition ${dto.requisitionId} not found`)
    }
    if (requisition.status !== "APPROVED") {
      throw new BadRequestException("The job requisition must be approved before it can be posted.")
    }

    const posting = await this.prisma.jobPosting.create({
      data: {
        requisitionId: dto.requisitionId,
        postingTitle: dto.postingTitle,
        isInternal: dto.isInternal ?? true,
        isExternal: dto.isExternal ?? false,
        closingDate: dto.closingDate,
        description: dto.description,
        responsibilities: dto.responsibilities,
        qualifications: dto.qualifications,
        branchId: dto.branchId,
        employmentType: dto.employmentType,
        requiredExperience: dto.requiredExperience,
      },
      include: JOB_POSTING_INCLUDE,
    })
    await this.log(posting.id, "CREATED", actingEmployeeId)
    return posting
  }

  async update(id: string, dto: UpdateJobPostingDto, actingEmployeeId: string) {
    const posting = await this.findOne(id, actingEmployeeId)
    if (posting.status !== "DRAFT") {
      throw new BadRequestException("Only a draft job posting can be edited.")
    }
    const updated = await this.prisma.jobPosting.update({ where: { id }, data: dto, include: JOB_POSTING_INCLUDE })
    await this.log(id, "UPDATED", actingEmployeeId)
    return updated
  }

  async publish(id: string, dto: ActingEmployeeDto) {
    const posting = await this.findOne(id, dto.actingEmployeeId)
    if (posting.status !== "DRAFT") {
      throw new BadRequestException("Only a draft job posting can be published.")
    }
    const updated = await this.prisma.jobPosting.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
      include: JOB_POSTING_INCLUDE,
    })
    await this.log(id, "PUBLISHED", dto.actingEmployeeId)
    return updated
  }

  async close(id: string, dto: ActingEmployeeDto) {
    const posting = await this.findOne(id, dto.actingEmployeeId)
    if (posting.status !== "PUBLISHED") {
      throw new BadRequestException("Only a published job posting can be closed.")
    }
    const updated = await this.prisma.jobPosting.update({
      where: { id },
      data: { status: "CLOSED", closedAt: new Date() },
      include: JOB_POSTING_INCLUDE,
    })
    await this.log(id, "CLOSED", dto.actingEmployeeId)
    return updated
  }

  private async log(id: string, action: string, actorId: string | null) {
    await this.prisma.recruitmentAuditLog.create({
      data: { entityType: "JobPosting", entityId: id, action, actorId },
    })
  }
}
