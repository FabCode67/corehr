import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { RecruitmentAccessService } from "../access/recruitment-access.service"
import { PrismaService } from "../../../prisma/prisma.service"
import { EmailService } from "../../email/email.service"

import { ActingEmployeeDto } from "./dto/acting-employee.dto"
import { CreateOfferDto } from "./dto/create-offer.dto"
import { UpdateOfferDto } from "./dto/update-offer.dto"

/** Seeded onto the Application the moment its offer is accepted, so the
 *  onboarding checklist is ready to work through immediately — same
 *  "create every step up front" pattern as RecruitmentStageInstance.
 *  EMPLOYEE_NUMBER_CREATED is deliberately included here too but is only
 *  ever completed by OnboardingService.completeOnboarding itself, never
 *  manually. */
const ALL_ONBOARDING_TASK_TYPES = [
  "EMPLOYEE_NUMBER_CREATED",
  "SYSTEM_ACCOUNTS_CREATED",
  "ID_CARD_ISSUED",
  "LAPTOP_ASSIGNED",
  "WORKSPACE_ASSIGNED",
  "MANDATORY_AML_TRAINING_ASSIGNED",
  "HR_ORIENTATION_SCHEDULED",
  "MANAGER_ORIENTATION_SCHEDULED",
  "DOCUMENTS_SIGNED",
] as const

const OFFER_INCLUDE = {
  position: { select: { id: true, title: true } },
  department: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  band: { select: { id: true, name: true } },
  createdBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
  application: {
    select: {
      id: true,
      candidateId: true,
      candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
      jobPosting: {
        select: {
          id: true,
          postingTitle: true,
          requisition: {
            select: { id: true, recruiterId: true, hiringManagerId: true, departmentId: true },
          },
        },
      },
    },
  },
} as const

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: RecruitmentAccessService,
    private readonly emailService: EmailService
  ) {}

  async findAll(applicationId: string | undefined, actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    return this.prisma.offer.findMany({
      where: {
        ...(applicationId ? { applicationId } : {}),
        ...(scope.allowAll ? {} : { application: this.accessService.buildApplicationWhere(scope) }),
      },
      include: OFFER_INCLUDE,
      orderBy: { createdAt: "desc" },
    })
  }

  async findOne(id: string, actingEmployeeId: string) {
    const offer = await this.prisma.offer.findUnique({ where: { id }, include: OFFER_INCLUDE })
    if (!offer) {
      throw new NotFoundException(`Offer ${id} not found`)
    }
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (!scope.allowAll && !this.accessService.canAccessRequisition(scope, offer.application.jobPosting.requisition)) {
      throw new ForbiddenException("You don't have access to this offer")
    }
    return offer
  }

  async create(dto: CreateOfferDto, actingEmployeeId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: dto.applicationId },
      include: { jobPosting: { include: { requisition: true } } },
    })
    if (!application) {
      throw new NotFoundException(`Application ${dto.applicationId} not found`)
    }
    const { requisition } = application.jobPosting

    const offer = await this.prisma.offer.create({
      data: {
        applicationId: dto.applicationId,
        positionId: requisition.positionId,
        departmentId: requisition.departmentId,
        branchId: requisition.branchId,
        contractType: dto.contractType,
        bandId: dto.bandId,
        proposedStartDate: dto.proposedStartDate,
        expiryDate: dto.expiryDate,
        offerLetterUrl: dto.offerLetterUrl,
        createdById: dto.createdById,
      },
      include: OFFER_INCLUDE,
    })
    await this.log(offer.id, "CREATED", actingEmployeeId)
    return offer
  }

  async update(id: string, dto: UpdateOfferDto, actingEmployeeId: string) {
    const offer = await this.findOne(id, actingEmployeeId)
    if (offer.status !== "DRAFT") {
      throw new BadRequestException("Only a draft offer can be edited.")
    }
    const updated = await this.prisma.offer.update({ where: { id }, data: dto, include: OFFER_INCLUDE })
    await this.log(id, "UPDATED", actingEmployeeId)
    return updated
  }

  async send(id: string, dto: ActingEmployeeDto) {
    const offer = await this.findOne(id, dto.actingEmployeeId)
    if (offer.status !== "DRAFT") {
      throw new BadRequestException("Only a draft offer can be sent.")
    }
    const [updated] = await this.prisma.$transaction([
      this.prisma.offer.update({ where: { id }, data: { status: "SENT", sentAt: new Date() }, include: OFFER_INCLUDE }),
      this.prisma.application.update({ where: { id: offer.applicationId }, data: { status: "OFFER" } }),
    ])
    await this.log(id, "SENT", dto.actingEmployeeId)

    try {
      await this.emailService.enqueue({
        templateKey: "recruitment_offer_letter",
        recipientEmail: updated.application.candidate.email,
        relatedModule: "recruitment",
        relatedEntityId: id,
        variables: {
          candidate_name: `${updated.application.candidate.firstName} ${updated.application.candidate.lastName}`,
          job_title: updated.application.jobPosting.postingTitle,
          offer_url: updated.offerLetterUrl ?? "#",
        },
      })
    } catch {
      // EmailService.enqueue() already logs internally.
    }

    return updated
  }

  async accept(id: string, dto: ActingEmployeeDto) {
    const offer = await this.findOne(id, dto.actingEmployeeId)
    if (offer.status !== "SENT") {
      throw new BadRequestException("Only a sent offer can be accepted.")
    }
    const [updated] = await this.prisma.$transaction([
      this.prisma.offer.update({
        where: { id },
        data: { status: "ACCEPTED", respondedAt: new Date() },
        include: OFFER_INCLUDE,
      }),
      this.prisma.onboardingTask.createMany({
        data: ALL_ONBOARDING_TASK_TYPES.map((taskType) => ({ applicationId: offer.applicationId, taskType })),
        skipDuplicates: true,
      }),
    ])
    await this.notifyResponse(offer, "OFFER_ACCEPTED")
    await this.log(id, "ACCEPTED", dto.actingEmployeeId)
    return updated
  }

  async decline(id: string, dto: ActingEmployeeDto) {
    const offer = await this.findOne(id, dto.actingEmployeeId)
    if (offer.status !== "SENT") {
      throw new BadRequestException("Only a sent offer can be declined.")
    }
    const [updated] = await this.prisma.$transaction([
      this.prisma.offer.update({ where: { id }, data: { status: "DECLINED", respondedAt: new Date() }, include: OFFER_INCLUDE }),
      this.prisma.application.update({ where: { id: offer.applicationId }, data: { status: "REJECTED" } }),
    ])
    await this.notifyResponse(offer, "OFFER_DECLINED")
    await this.log(id, "DECLINED", dto.actingEmployeeId)
    return updated
  }

  async expire(id: string, dto: ActingEmployeeDto) {
    const offer = await this.findOne(id, dto.actingEmployeeId)
    if (offer.status !== "SENT") {
      throw new BadRequestException("Only a sent offer can be marked expired.")
    }
    const updated = await this.prisma.offer.update({
      where: { id },
      data: { status: "EXPIRED" },
      include: OFFER_INCLUDE,
    })
    await this.log(id, "EXPIRED", dto.actingEmployeeId)
    return updated
  }

  /** Candidates have no login/notification channel (see module doc comment),
   *  so the offer response is surfaced to the recruiter/hiring manager
   *  instead, using the 2 NotificationTypes added specifically for this. */
  private async notifyResponse(
    offer: { application: { candidate: { firstName: string; lastName: string }; jobPosting: { requisition: { recruiterId: string; hiringManagerId: string } } } },
    type: "OFFER_ACCEPTED" | "OFFER_DECLINED"
  ) {
    const candidateName = `${offer.application.candidate.firstName} ${offer.application.candidate.lastName}`
    const { recruiterId, hiringManagerId } = offer.application.jobPosting.requisition
    const recipients = Array.from(new Set([recruiterId, hiringManagerId]))
    const verb = type === "OFFER_ACCEPTED" ? "accepted" : "declined"

    await this.prisma.notification.createMany({
      data: recipients.map((recipientEmployeeId) => ({
        recipientEmployeeId,
        type,
        title: `Offer ${verb}`,
        message: `${candidateName} has ${verb} the offer.`,
      })),
    })
  }

  private async log(id: string, action: string, actorId: string | null) {
    await this.prisma.recruitmentAuditLog.create({
      data: { entityType: "Offer", entityId: id, action, actorId },
    })
  }
}
