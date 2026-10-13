import { randomBytes } from "node:crypto"

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { JobPostingStatus, Prisma } from "@prisma/client"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../../common/pagination"
import { PrismaService } from "../../../prisma/prisma.service"
import { RecruitmentAccessScope, RecruitmentAccessService } from "../access/recruitment-access.service"
import { RecruitmentWorkflowsService } from "../workflows/recruitment-workflows.service"
import { SetPostingStepsDto } from "./dto/set-posting-steps.dto"

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

/** "senior-credit-analyst-x7k2m9qa" — readable but unguessable. */
export function makeShareSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
  return `${base || "job"}-${randomBytes(5).toString("hex")}`
}

export interface JobPostingFilters {
  status?: string
  requisitionId?: string
  branchId?: string
}

@Injectable()
export class JobPostingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: RecruitmentAccessService,
    private readonly workflowsService: RecruitmentWorkflowsService
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
        jobDescriptionId: dto.jobDescriptionId ?? requisition.jobDescriptionId ?? undefined,
        requiredDocuments: dto.requiredDocuments ?? [],
        shareSlug: makeShareSlug(dto.postingTitle),
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
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        ...(posting.shareSlug ? {} : { shareSlug: makeShareSlug(posting.postingTitle) }),
      },
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

  /** The posting's hiring steps: HR's custom list when one exists, otherwise
   *  the stages of the default workflow matched to the requisition. */
  async getSteps(id: string, actingEmployeeId: string) {
    const posting = await this.findOne(id, actingEmployeeId)
    const custom = await this.prisma.jobPostingStep.findMany({
      where: { postingId: id },
      orderBy: { sequence: "asc" },
      include: { stage: { select: { id: true, name: true, stageType: true, isScored: true } } },
    })
    if (custom.length > 0) {
      return { custom: true, steps: custom.map((c) => ({ sequence: c.sequence, ...c.stage })) }
    }
    const req = await this.prisma.jobRequisition.findUnique({ where: { id: posting.requisition.id }, select: { bandId: true, contractType: true } })
    const workflow = await this.workflowsService.resolveWorkflowFor({ bandId: req?.bandId, contractType: req?.contractType })
    const stages = await this.prisma.recruitmentWorkflowStage.findMany({
      where: { workflowId: workflow.id },
      orderBy: { sequence: "asc" },
      include: { stage: { select: { id: true, name: true, stageType: true, isScored: true } } },
    })
    return { custom: false, workflowName: workflow.name, steps: stages.map((w) => ({ sequence: w.sequence, ...w.stage })) }
  }

  /** Replaces the posting's hiring steps. Applications already in the
   *  pipeline keep the steps they were created with; new ones follow these. */
  async setSteps(id: string, dto: SetPostingStepsDto) {
    await this.findOne(id, dto.actingEmployeeId)
    const unique = [...new Set(dto.stageIds)]
    const found = await this.prisma.recruitmentStageDefinition.count({ where: { id: { in: unique }, isActive: true } })
    if (found !== unique.length) throw new BadRequestException("One or more steps don't exist or are inactive.")
    await this.prisma.$transaction([
      this.prisma.jobPostingStep.deleteMany({ where: { postingId: id } }),
      this.prisma.jobPostingStep.createMany({ data: unique.map((stageId, i) => ({ postingId: id, stageId, sequence: i + 1 })) }),
    ])
    await this.log(id, "STEPS_SET", dto.actingEmployeeId)
    return this.getSteps(id, dto.actingEmployeeId)
  }

  async clearSteps(id: string, actingEmployeeId: string) {
    await this.findOne(id, actingEmployeeId)
    await this.prisma.jobPostingStep.deleteMany({ where: { postingId: id } })
    await this.log(id, "STEPS_RESET", actingEmployeeId)
    return this.getSteps(id, actingEmployeeId)
  }

  /** Hiring board: every applicant of the posting with their current step, so
   *  HR can shortlist/reject step by step until the final selection. */
  async getBoard(id: string, actingEmployeeId: string) {
    const posting = await this.findOne(id, actingEmployeeId)
    const applications = await this.prisma.application.findMany({
      where: { jobPostingId: id },
      orderBy: [{ overallScore: { sort: "desc", nulls: "last" } }, { appliedAt: "asc" }],
      select: {
        id: true,
        status: true,
        overallScore: true,
        appliedAt: true,
        currentStageId: true,
        hiredEmployeeNumber: true,
        candidate: { select: { firstName: true, lastName: true, email: true } },
        stageInstances: { orderBy: { sequence: "asc" }, select: { id: true, stageId: true, sequence: true, status: true, score: true, stage: { select: { name: true } } } },
      },
    })
    const requisition = await this.prisma.jobRequisition.findUnique({
      where: { id: posting.requisition.id },
      select: { id: true, numberOfVacancies: true, status: true },
    })
    const hired = await this.prisma.application.count({ where: { status: "HIRED", jobPosting: { requisitionId: posting.requisition.id } } })
    return { applications, vacancies: requisition?.numberOfVacancies ?? 1, hired, requisitionStatus: requisition?.status ?? null, requisitionId: posting.requisition.id }
  }

  private async log(id: string, action: string, actorId: string | null) {
    await this.prisma.recruitmentAuditLog.create({
      data: { entityType: "JobPosting", entityId: id, action, actorId },
    })
  }
}
