import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { ApplicationStatus, Prisma } from "@prisma/client"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../../common/pagination"
import { buildClientUrl } from "../../../common/client-url.util"
import { PrismaService } from "../../../prisma/prisma.service"
import { EmailService } from "../../email/email.service"
import { RecruitmentAccessScope, RecruitmentAccessService } from "../access/recruitment-access.service"
import { RecruitmentWorkflowsService } from "../workflows/recruitment-workflows.service"

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
    private readonly accessService: RecruitmentAccessService,
    private readonly emailService: EmailService,
    private readonly workflowsService: RecruitmentWorkflowsService
  ) {}

  private async safeSendEmail(params: Parameters<EmailService["enqueue"]>[0]) {
    try {
      await this.emailService.enqueue(params)
    } catch {
      // EmailService.enqueue() already logs internally.
    }
  }

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
    const jobPosting = await this.prisma.jobPosting.findUnique({
      where: { id: dto.jobPostingId },
      include: { requisition: { select: { bandId: true, contractType: true } } },
    })
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

    // Resolved once, up front — see RecruitmentWorkflowsService.resolveWorkflowFor's
    // doc comment on why this is fixed at creation rather than re-resolved later.
    const workflow = await this.workflowsService.resolveWorkflowFor({
      bandId: jobPosting.requisition?.bandId ?? null,
      contractType: jobPosting.requisition?.contractType ?? null,
    })
    const workflowStages = await this.prisma.recruitmentWorkflowStage.findMany({
      where: { workflowId: workflow.id },
      orderBy: { sequence: "asc" },
    })

    try {
      const application = await this.prisma.$transaction(async (tx) => {
        const created = await tx.application.create({
          data: { candidateId: dto.candidateId, jobPostingId: dto.jobPostingId, workflowId: workflow.id },
          include: APPLICATION_INCLUDE,
        })

        if (workflowStages.length > 0) {
          await tx.applicationStageInstance.createMany({
            data: workflowStages.map((ws, index) => ({
              applicationId: created.id,
              stageId: ws.stageId,
              sequence: ws.sequence,
              status: index === 0 ? "IN_PROGRESS" : "PENDING",
              startedAt: index === 0 ? new Date() : null,
            })),
          })
          await tx.application.update({ where: { id: created.id }, data: { currentStageId: workflowStages[0].stageId } })
        }

        return created
      })
      await this.log(application.id, "CREATED", actingEmployeeId, `workflow: ${workflow.name}`)

      await this.safeSendEmail({
        templateKey: "recruitment_application_received",
        recipientEmail: candidate.email,
        relatedModule: "recruitment",
        relatedEntityId: application.id,
        variables: {
          candidate_name: `${candidate.firstName} ${candidate.lastName}`,
          job_title: application.jobPosting.postingTitle,
        },
      })

      const recruiterId = application.jobPosting.requisition?.recruiterId
      if (recruiterId) {
        const recruiter = await this.prisma.employee.findUnique({ where: { employeeNumber: recruiterId }, select: { email: true } })
        if (recruiter) {
          await this.safeSendEmail({
            templateKey: "recruitment_recruiter_new_application",
            recipientEmail: recruiter.email,
            recipientEmployeeId: recruiterId,
            relatedModule: "recruitment",
            relatedEntityId: application.id,
            variables: {
              candidate_name: `${candidate.firstName} ${candidate.lastName}`,
              job_title: application.jobPosting.postingTitle,
              application_url: buildClientUrl(`/admin/recruitment/applications/${application.id}`),
            },
          })
        }
      }

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

    if (dto.status === "REJECTED") {
      await this.safeSendEmail({
        templateKey: "recruitment_rejection",
        recipientEmail: updated.candidate.email,
        relatedModule: "recruitment",
        relatedEntityId: id,
        variables: {
          candidate_name: `${updated.candidate.firstName} ${updated.candidate.lastName}`,
          job_title: updated.jobPosting.postingTitle,
        },
      })
    }

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

    if (STATUS_FOR_DECISION[dto.decision] === "REJECTED") {
      await this.safeSendEmail({
        templateKey: "recruitment_rejection",
        recipientEmail: application.candidate.email,
        relatedModule: "recruitment",
        relatedEntityId: id,
        variables: {
          candidate_name: `${application.candidate.firstName} ${application.candidate.lastName}`,
          job_title: application.jobPosting.postingTitle,
        },
      })
    }

    return application
  }

  private async log(id: string, action: string, actorId: string | null, notes?: string) {
    await this.prisma.recruitmentAuditLog.create({
      data: { entityType: "Application", entityId: id, action, actorId, notes: notes || null },
    })
  }
}
