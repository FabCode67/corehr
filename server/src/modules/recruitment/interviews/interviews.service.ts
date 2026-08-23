import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { RecruitmentAccessService } from "../access/recruitment-access.service"
import { buildClientUrl } from "../../../common/client-url.util"
import { PrismaService } from "../../../prisma/prisma.service"
import { EmailService } from "../../email/email.service"

import { CreateInterviewDto } from "./dto/create-interview.dto"
import { RecordInterviewOutcomeDto } from "./dto/record-interview-outcome.dto"
import { SetPanelistsDto } from "./dto/set-panelists.dto"
import { UpdateInterviewDto } from "./dto/update-interview.dto"

const INTERVIEW_INCLUDE = {
  panelists: { include: { employee: { select: { employeeNumber: true, firstName: true, lastName: true } } } },
  application: {
    select: {
      id: true,
      candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
      jobPosting: {
        select: {
          id: true,
          postingTitle: true,
          requisition: { select: { id: true, recruiterId: true, hiringManagerId: true, departmentId: true } },
        },
      },
    },
  },
} as const

@Injectable()
export class InterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: RecruitmentAccessService,
    private readonly emailService: EmailService
  ) {}

  private async safeSendEmail(params: Parameters<EmailService["enqueue"]>[0]) {
    try {
      await this.emailService.enqueue(params)
    } catch {
      // EmailService.enqueue() already logs internally.
    }
  }

  async findAll(applicationId: string | undefined, actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    return this.prisma.interview.findMany({
      where: {
        ...(applicationId ? { applicationId } : {}),
        ...(scope.allowAll ? {} : { application: this.accessService.buildApplicationWhere(scope) }),
      },
      include: INTERVIEW_INCLUDE,
      orderBy: { interviewDate: "asc" },
    })
  }

  async findOne(id: string, actingEmployeeId: string) {
    const interview = await this.prisma.interview.findUnique({ where: { id }, include: INTERVIEW_INCLUDE })
    if (!interview) {
      throw new NotFoundException(`Interview ${id} not found`)
    }
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (!scope.allowAll && !this.accessService.canAccessRequisition(scope, interview.application.jobPosting.requisition)) {
      throw new ForbiddenException("You don't have access to this interview")
    }
    return interview
  }

  async create(dto: CreateInterviewDto, actingEmployeeId: string) {
    const application = await this.prisma.application.findUnique({ where: { id: dto.applicationId } })
    if (!application) {
      throw new NotFoundException(`Application ${dto.applicationId} not found`)
    }

    const interview = await this.prisma.interview.create({
      data: {
        applicationId: dto.applicationId,
        interviewType: dto.interviewType,
        interviewDate: dto.interviewDate,
        location: dto.location,
        panelists: dto.panelistIds?.length
          ? { create: dto.panelistIds.map((employeeId) => ({ employeeId })) }
          : undefined,
      },
      include: INTERVIEW_INCLUDE,
    })
    await this.log(interview.id, "CREATED", actingEmployeeId)

    const interviewDateStr = interview.interviewDate.toISOString().slice(0, 10)
    const interviewTimeStr = interview.interviewDate.toISOString().slice(11, 16)

    await this.safeSendEmail({
      templateKey: "recruitment_interview_invitation",
      recipientEmail: interview.application.candidate.email,
      relatedModule: "recruitment",
      relatedEntityId: interview.id,
      variables: {
        candidate_name: `${interview.application.candidate.firstName} ${interview.application.candidate.lastName}`,
        job_title: interview.application.jobPosting.postingTitle,
        interview_date: interviewDateStr,
        interview_time: interviewTimeStr,
        interview_mode: interview.location ?? interview.interviewType,
      },
    })

    const recruiterId = interview.application.jobPosting.requisition?.recruiterId
    if (recruiterId) {
      const recruiter = await this.prisma.employee.findUnique({ where: { employeeNumber: recruiterId }, select: { email: true } })
      if (recruiter) {
        await this.safeSendEmail({
          templateKey: "recruitment_interview_scheduled_recruiter",
          recipientEmail: recruiter.email,
          recipientEmployeeId: recruiterId,
          relatedModule: "recruitment",
          relatedEntityId: interview.id,
          variables: {
            candidate_name: `${interview.application.candidate.firstName} ${interview.application.candidate.lastName}`,
            job_title: interview.application.jobPosting.postingTitle,
            interview_date: interviewDateStr,
            interview_time: interviewTimeStr,
            application_url: buildClientUrl(`/admin/recruitment/applications/${interview.applicationId}`),
          },
        })
      }
    }

    return interview
  }

  async update(id: string, dto: UpdateInterviewDto, actingEmployeeId: string) {
    await this.findOne(id, actingEmployeeId)
    const updated = await this.prisma.interview.update({ where: { id }, data: dto, include: INTERVIEW_INCLUDE })
    await this.log(id, "UPDATED", actingEmployeeId)
    return updated
  }

  async setPanelists(id: string, dto: SetPanelistsDto, actingEmployeeId: string) {
    await this.findOne(id, actingEmployeeId)
    await this.prisma.$transaction([
      this.prisma.interviewPanelist.deleteMany({ where: { interviewId: id } }),
      this.prisma.interviewPanelist.createMany({
        data: dto.panelistIds.map((employeeId) => ({ interviewId: id, employeeId })),
      }),
    ])
    await this.log(id, "PANELISTS_UPDATED", actingEmployeeId)
    return this.prisma.interview.findUnique({ where: { id }, include: INTERVIEW_INCLUDE })
  }

  async recordOutcome(id: string, dto: RecordInterviewOutcomeDto) {
    await this.findOne(id, dto.actingEmployeeId)
    const updated = await this.prisma.interview.update({
      where: { id },
      data: { recommendation: dto.recommendation, notes: dto.notes, status: "COMPLETED" },
      include: INTERVIEW_INCLUDE,
    })
    await this.log(id, "OUTCOME_RECORDED", dto.actingEmployeeId, dto.recommendation)
    return updated
  }

  private async log(id: string, action: string, actorId: string | null, notes?: string) {
    await this.prisma.recruitmentAuditLog.create({
      data: { entityType: "Interview", entityId: id, action, actorId, notes: notes || null },
    })
  }
}
