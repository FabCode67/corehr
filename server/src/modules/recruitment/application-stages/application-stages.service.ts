import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { ApplicationStageStatus, ApplicationStatus } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"
import { EmailService } from "../../email/email.service"
import { RecruitmentAccessService } from "../access/recruitment-access.service"

import { StageDecisionDto } from "./dto/stage-decision.dto"
import { SubmitStageScoreDto } from "./dto/submit-stage-score.dto"

const STAGE_INSTANCE_INCLUDE = {
  stage: true,
  decidedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
  scores: { include: { criterion: true } },
} as const

/**
 * The candidate-facing pipeline actions ("Candidate Progression" in the ATS
 * spec) plus scoring/ranking — operates on ApplicationStageInstance rows
 * seeded by ApplicationsService.create() from the application's resolved
 * RecruitmentWorkflow. Separate service from ApplicationsService (which
 * owns the coarse ApplicationStatus + Screening) so this file stays focused
 * on the new stage-engine surface; the two stay in sync because every
 * action here also nudges Application.status/currentStageId/overallScore.
 */
@Injectable()
export class ApplicationStagesService {
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

  private async loadApplication(applicationId: string, actingEmployeeId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: true,
        jobPosting: { select: { postingTitle: true, requisition: { select: { recruiterId: true, hiringManagerId: true, departmentId: true } } } },
        stageInstances: { include: STAGE_INSTANCE_INCLUDE, orderBy: { sequence: "asc" } },
      },
    })
    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`)
    }
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (!scope.allowAll && application.jobPosting.requisition && !this.accessService.canAccessRequisition(scope, application.jobPosting.requisition)) {
      throw new ForbiddenException("You don't have access to this application")
    }
    return application
  }

  getPipeline(applicationId: string, actingEmployeeId: string) {
    return this.loadApplication(applicationId, actingEmployeeId).then((application) => application.stageInstances)
  }

  private async log(applicationId: string, action: string, actorId: string, notes?: string) {
    await this.prisma.recruitmentAuditLog.create({
      data: { entityType: "Application", entityId: applicationId, action, actorId, notes: notes || null },
    })
  }

  /** Marks the current stage PASSED and moves to the next PENDING stage
   *  (IN_PROGRESS). If this was the last stage, clears currentStageId
   *  (pipeline complete) and, when the completed stage's type signals a
   *  terminal outcome (OFFER/ADMIN — i.e. Offer/Hiring), nudges
   *  Application.status to match; actually creating the Employee record
   *  from a hire is still RecruitmentOnboardingService's job, unchanged by
   *  this feature. */
  async advance(applicationId: string, dto: StageDecisionDto) {
    const application = await this.loadApplication(applicationId, dto.actingEmployeeId)
    const current = application.stageInstances.find((s) => s.id === application.currentStageId || s.stageId === application.currentStageId)
    if (!current) {
      throw new BadRequestException("This application has no active stage to advance from.")
    }

    const currentIndex = application.stageInstances.findIndex((s) => s.id === current.id)
    const next = application.stageInstances[currentIndex + 1]

    await this.prisma.applicationStageInstance.update({
      where: { id: current.id },
      data: { status: "PASSED", completedAt: new Date(), decidedById: dto.actingEmployeeId, comments: dto.comments },
    })

    let statusUpdate: ApplicationStatus | undefined
    if (current.stage.stageType === "OFFER") statusUpdate = "OFFER"
    if (current.stage.stageType === "ADMIN") statusUpdate = "HIRED"

    if (next) {
      await this.prisma.applicationStageInstance.update({ where: { id: next.id }, data: { status: "IN_PROGRESS", startedAt: new Date() } })
      await this.prisma.application.update({ where: { id: applicationId }, data: { currentStageId: next.stageId, status: statusUpdate } })

      await this.safeSendEmail({
        templateKey: "recruitment_stage_progress",
        recipientEmail: application.candidate.email,
        relatedModule: "recruitment",
        relatedEntityId: applicationId,
        variables: {
          candidate_name: `${application.candidate.firstName} ${application.candidate.lastName}`,
          job_title: application.jobPosting.postingTitle,
          stage_name: next.stage.name,
        },
      })
    } else {
      await this.prisma.application.update({ where: { id: applicationId }, data: { currentStageId: null, status: statusUpdate } })
    }

    await this.log(applicationId, "STAGE_ADVANCED", dto.actingEmployeeId, `${current.stage.name} -> ${next ? next.stage.name : "complete"}`)
    return this.getPipeline(applicationId, dto.actingEmployeeId)
  }

  /** Moves the candidate back one stage — the current stage returns to
   *  PENDING and the previous non-pending stage becomes IN_PROGRESS again.
   *  For correcting a premature advance, not a formal "fail and retry". */
  async returnToPrevious(applicationId: string, dto: StageDecisionDto) {
    const application = await this.loadApplication(applicationId, dto.actingEmployeeId)
    const currentIndex = application.stageInstances.findIndex((s) => s.stageId === application.currentStageId)
    if (currentIndex <= 0) {
      throw new BadRequestException("There's no previous stage to return to.")
    }
    const current = application.stageInstances[currentIndex]
    const previous = application.stageInstances[currentIndex - 1]

    await this.prisma.applicationStageInstance.update({
      where: { id: current.id },
      data: { status: "PENDING", startedAt: null, completedAt: null, decidedById: null },
    })
    await this.prisma.applicationStageInstance.update({
      where: { id: previous.id },
      data: { status: "IN_PROGRESS", completedAt: null, comments: dto.comments },
    })
    await this.prisma.application.update({ where: { id: applicationId }, data: { currentStageId: previous.stageId, status: "UNDER_REVIEW" } })

    await this.log(applicationId, "STAGE_RETURNED", dto.actingEmployeeId, `${current.stage.name} -> ${previous.stage.name}`)
    return this.getPipeline(applicationId, dto.actingEmployeeId)
  }

  /** Holds the candidate at their current stage without failing or
   *  advancing them — e.g. waiting on a reference check outside the
   *  pipeline. */
  async hold(applicationId: string, dto: StageDecisionDto) {
    const application = await this.loadApplication(applicationId, dto.actingEmployeeId)
    const current = application.stageInstances.find((s) => s.stageId === application.currentStageId)
    if (!current) {
      throw new BadRequestException("This application has no active stage to hold.")
    }
    await this.prisma.applicationStageInstance.update({ where: { id: current.id }, data: { status: "ON_HOLD", comments: dto.comments } })
    await this.prisma.application.update({ where: { id: applicationId }, data: { status: "UNDER_REVIEW" } })
    await this.log(applicationId, "STAGE_HELD", dto.actingEmployeeId, current.stage.name)
    return this.getPipeline(applicationId, dto.actingEmployeeId)
  }

  /** Rejects the application outright — the current stage and every
   *  not-yet-completed stage are marked SKIPPED (already-PASSED stages keep
   *  their history), and a rejection email goes out, same template
   *  ApplicationsService.screen()/updateStatus() already use. */
  async reject(applicationId: string, dto: StageDecisionDto) {
    return this.terminate(applicationId, dto, "REJECTED", "STAGE_REJECTED", true)
  }

  /** Same as reject(), but candidate-initiated — no rejection email, since
   *  they already know. */
  async withdraw(applicationId: string, dto: StageDecisionDto) {
    return this.terminate(applicationId, dto, "WITHDRAWN", "APPLICATION_WITHDRAWN", false)
  }

  private async terminate(applicationId: string, dto: StageDecisionDto, status: "REJECTED" | "WITHDRAWN", action: string, sendRejectionEmail: boolean) {
    const application = await this.loadApplication(applicationId, dto.actingEmployeeId)
    const openStatuses: ApplicationStageStatus[] = ["PENDING", "IN_PROGRESS", "ON_HOLD"]

    await this.prisma.applicationStageInstance.updateMany({
      where: { applicationId, status: { in: openStatuses } },
      data: { status: "SKIPPED", completedAt: new Date() },
    })
    await this.prisma.application.update({ where: { id: applicationId }, data: { status, currentStageId: null } })
    await this.log(applicationId, action, dto.actingEmployeeId, dto.comments)

    if (sendRejectionEmail) {
      await this.safeSendEmail({
        templateKey: "recruitment_rejection",
        recipientEmail: application.candidate.email,
        relatedModule: "recruitment",
        relatedEntityId: applicationId,
        variables: {
          candidate_name: `${application.candidate.firstName} ${application.candidate.lastName}`,
          job_title: application.jobPosting.postingTitle,
        },
      })
    }

    return this.getPipeline(applicationId, dto.actingEmployeeId)
  }

  /** Upserts one criterion's score against a stage instance, recomputes
   *  that stage's rolled-up score (average of its criteria), then
   *  recomputes the application's overall score (average of every stage
   *  that has a score at all) — the "Candidate Ranking" spec section's
   *  ranking key. */
  async submitScore(stageInstanceId: string, dto: SubmitStageScoreDto) {
    const stageInstance = await this.prisma.applicationStageInstance.findUnique({
      where: { id: stageInstanceId },
      include: { application: { include: { jobPosting: { select: { requisition: { select: { recruiterId: true, hiringManagerId: true, departmentId: true } } } } } } },
    })
    if (!stageInstance) {
      throw new NotFoundException(`Stage instance ${stageInstanceId} not found`)
    }
    const scope = await this.accessService.resolveScope(dto.actingEmployeeId)
    if (!scope.allowAll && stageInstance.application.jobPosting.requisition && !this.accessService.canAccessRequisition(scope, stageInstance.application.jobPosting.requisition)) {
      throw new ForbiddenException("You don't have access to this application")
    }

    const criterion = await this.prisma.recruitmentScoringCriterion.findUnique({ where: { id: dto.criterionId } })
    if (!criterion) {
      throw new NotFoundException(`Scoring criterion ${dto.criterionId} not found`)
    }
    if (dto.score > criterion.maxScore) {
      throw new BadRequestException(`Score can't exceed this criterion's max of ${criterion.maxScore}.`)
    }

    await this.prisma.applicationStageScore.upsert({
      where: { stageInstanceId_criterionId: { stageInstanceId, criterionId: dto.criterionId } },
      create: { stageInstanceId, criterionId: dto.criterionId, score: dto.score, scoredById: dto.actingEmployeeId, comments: dto.comments },
      update: { score: dto.score, scoredById: dto.actingEmployeeId, comments: dto.comments },
    })

    const scores = await this.prisma.applicationStageScore.findMany({ where: { stageInstanceId }, include: { criterion: true } })
    // Normalized to a 0-100 scale so stages with different maxScore rubrics
    // (a 1-5 criterion vs. a hypothetical 1-10 one) roll up consistently.
    const normalizedAvg = scores.length > 0 ? scores.reduce((sum, s) => sum + (s.score / s.criterion.maxScore) * 100, 0) / scores.length : null
    await this.prisma.applicationStageInstance.update({ where: { id: stageInstanceId }, data: { score: normalizedAvg } })

    await this.recomputeOverallScore(stageInstance.applicationId)
    await this.log(stageInstance.applicationId, "STAGE_SCORED", dto.actingEmployeeId, `${criterion.name}: ${dto.score}/${criterion.maxScore}`)

    return this.prisma.applicationStageInstance.findUnique({ where: { id: stageInstanceId }, include: STAGE_INSTANCE_INCLUDE })
  }

  private async recomputeOverallScore(applicationId: string) {
    const scoredStages = await this.prisma.applicationStageInstance.findMany({ where: { applicationId, score: { not: null } } })
    const overallScore = scoredStages.length > 0 ? scoredStages.reduce((sum, s) => sum + (s.score ?? 0), 0) / scoredStages.length : null
    await this.prisma.application.update({ where: { id: applicationId }, data: { overallScore } })
  }

  /** The "Candidate Ranking" table — every application against one posting,
   *  ranked by overallScore descending (unscored candidates sort last, not
   *  excluded — HR may still want to see where they'd otherwise place). */
  async rankForPosting(jobPostingId: string, actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    const applications = await this.prisma.application.findMany({
      where: {
        jobPostingId,
        ...(scope.allowAll ? {} : { jobPosting: { requisition: { OR: [{ recruiterId: scope.actingEmployeeId }, { hiringManagerId: scope.actingEmployeeId }, ...(scope.departmentIds.length ? [{ departmentId: { in: scope.departmentIds } }] : [])] } } }),
      },
      include: { candidate: { select: { firstName: true, lastName: true, email: true } }, currentStage: true },
    })

    return applications
      .sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1))
      .map((application, index) => ({
        rank: index + 1,
        applicationId: application.id,
        candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
        candidateEmail: application.candidate.email,
        currentStageName: application.currentStage?.name ?? null,
        status: application.status,
        overallScore: application.overallScore,
      }))
  }
}
