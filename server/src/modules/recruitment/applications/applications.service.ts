import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { ApplicationStatus, Prisma } from "@prisma/client"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../../common/pagination"
import { PrismaService } from "../../../prisma/prisma.service"
import { RecruitmentAccessScope, RecruitmentAccessService } from "../access/recruitment-access.service"

import { CreateApplicationDto } from "./dto/create-application.dto"
import { CreateScreeningDto } from "./dto/create-screening.dto"
import { UpdateApplicationStatusDto } from "./dto/update-application-status.dto"

const APPLICATION_INCLUDE = {
  candidate: true,
  jobPosting: {
    select: {
      id: true,
      postingTitle: true,
      requisition: {
        select: { id: true, recruiterId: true, hiringManagerId: true, departmentId: true },
      },
    },
  },
  screening: { include: { screenedBy: { select: { employeeNumber: true, firstName: true, lastName: true } } } },
} as const

/** A ScreeningDecision moves the application's overall status forward so
 *  the pipeline stage (Kanban column) reflects the latest decision without
 *  requiring a second, separate status-update call. HOLD deliberately keeps
 *  the application under review rather than moving it. */
const STATUS_FOR_DECISION: Record<string, ApplicationStatus> = {
  SHORTLIST: ApplicationStatus.SHORTLISTED,
  RECOMMEND: ApplicationStatus.SHORTLISTED,
  REJECT: ApplicationStatus.REJECTED,
  HOLD: ApplicationStatus.UNDER_REVIEW,
}

export interface ApplicationFilters {
  jobPostingId?: string
  status?: string
}

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: RecruitmentAccessService
  ) {}

  private buildWhere(filters: ApplicationFilters, scope: RecruitmentAccessScope): Prisma.ApplicationWhereInput {
    const filterWhere: Prisma.ApplicationWhereInput = {
      ...(filters.jobPostingId ? { jobPostingId: filters.jobPostingId } : {}),
      ...(filters.status ? { status: filters.status as ApplicationStatus } : {}),
    }
    if (scope.allowAll) return filterWhere
    return { AND: [this.accessService.buildApplicationWhere(scope), filterWhere] }
  }

  async findAll(filters: ApplicationFilters, actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    return this.prisma.application.findMany({
      where: this.buildWhere(filters, scope),
      include: APPLICATION_INCLUDE,
      orderBy: { appliedAt: "desc" },
    })
  }

  async findAllPaginated(
    filters: ApplicationFilters,
    actingEmployeeId: string,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResult<unknown>> {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    const where = this.buildWhere(filters, scope)
    const { skip, take, page: normalizedPage, pageSize: normalizedPageSize } = normalizePagination(page, pageSize)

    const [data, total] = await Promise.all([
      this.prisma.application.findMany({ where, include: APPLICATION_INCLUDE, orderBy: { appliedAt: "desc" }, skip, take }),
      this.prisma.application.count({ where }),
    ])

    return buildPaginatedResult(data, total, normalizedPage, normalizedPageSize)
  }

  async findOne(id: string, actingEmployeeId: string) {
    const application = await this.prisma.application.findUnique({ where: { id }, include: APPLICATION_INCLUDE })
    if (!application) {
      throw new NotFoundException(`Application ${id} not found`)
    }
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (!scope.allowAll && !this.accessService.canAccessRequisition(scope, application.jobPosting.requisition)) {
      throw new ForbiddenException("You don't have access to this application")
    }
    return application
  }

  async create(dto: CreateApplicationDto, actingEmployeeId: string) {
    const jobPosting = await this.prisma.jobPosting.findUnique({ where: { id: dto.jobPostingId } })
    if (!jobPosting) {
      throw new NotFoundException(`Job posting ${dto.jobPostingId} not found`)
    }
    if (jobPosting.status !== "PUBLISHED") {
      throw new BadRequestException("Applications can only be recorded against a published job posting.")
    }
    const candidate = await this.prisma.candidate.findUnique({ where: { id: dto.candidateId } })
    if (!candidate) {
      throw new NotFoundException(`Candidate ${dto.candidateId} not found`)
    }

    try {
      const application = await this.prisma.application.create({
        data: { candidateId: dto.candidateId, jobPostingId: dto.jobPostingId },
        include: APPLICATION_INCLUDE,
      })
      await this.log(application.id, "CREATED", actingEmployeeId)
      return application
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("This candidate has already applied to this job posting.")
      }
      throw error
    }
  }

  async updateStatus(id: string, dto: UpdateApplicationStatusDto) {
    await this.findOne(id, dto.actingEmployeeId)
    const updated = await this.prisma.application.update({
      where: { id },
      data: { status: dto.status },
      include: APPLICATION_INCLUDE,
    })
    await this.log(id, "STATUS_CHANGED", dto.actingEmployeeId, dto.status)
    return updated
  }

  /** Records (or amends) the screening decision and moves the application's
   *  overall status per STATUS_FOR_DECISION — see comment above. */
  async screen(id: string, dto: CreateScreeningDto, actingEmployeeId: string) {
    await this.findOne(id, actingEmployeeId)

    const [, application] = await this.prisma.$transaction([
      this.prisma.screening.upsert({
        where: { applicationId: id },
        create: { applicationId: id, decision: dto.decision, comments: dto.comments, screenedById: dto.screenedById },
        update: { decision: dto.decision, comments: dto.comments, screenedById: dto.screenedById, screenedAt: new Date() },
      }),
      this.prisma.application.update({
        where: { id },
        data: { status: STATUS_FOR_DECISION[dto.decision] ?? undefined },
        include: APPLICATION_INCLUDE,
      }),
    ])

    await this.log(id, "SCREENED", actingEmployeeId, dto.decision)
    return application
  }

  private async log(id: string, action: string, actorId: string | null, notes?: string) {
    await this.prisma.recruitmentAuditLog.create({
      data: { entityType: "Application", entityId: id, action, actorId, notes: notes || null },
    })
  }
}
