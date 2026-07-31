import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { Prisma } from "@prisma/client"

import { buildClientUrl } from "../../../common/client-url.util"
import { PrismaService } from "../../../prisma/prisma.service"
import { EmailService } from "../../email/email.service"

import { RejectFormDto } from "./dto/reject-form.dto"
import { SignFormDto } from "./dto/sign-form.dto"

const SIGNATURE_INCLUDE = {
  formSignatureStage: true,
  formInstance: {
    include: {
      formTemplate: { include: { signatureStages: { orderBy: { stageOrder: "asc" as const } } } },
      signatures: { include: { formSignatureStage: true } },
      employee: { select: { employeeNumber: true, firstName: true, lastName: true } },
    },
  },
} as const

@Injectable()
export class FormSignaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  private async findSignatureOrThrow(signatureId: string) {
    const signature = await this.prisma.formSignature.findUnique({ where: { id: signatureId }, include: SIGNATURE_INCLUDE })
    if (!signature) {
      throw new NotFoundException(`Signature ${signatureId} not found`)
    }
    return signature
  }

  private assertIsCurrentSigner(
    signature: Prisma.FormSignatureGetPayload<{ include: typeof SIGNATURE_INCLUDE }>,
    actingEmployeeId: string
  ) {
    if (signature.signerId !== actingEmployeeId) {
      throw new ForbiddenException("You are not the signer for this signature.")
    }
    if (signature.status !== "PENDING") {
      throw new BadRequestException("This signature has already been actioned.")
    }

    const stageOrders = signature.formInstance.formTemplate.signatureStages.map((stage) => stage.stageOrder)
    const earlierStages = stageOrders.filter((order) => order < signature.formSignatureStage.stageOrder)
    if (earlierStages.length > 0) {
      const earliestUnsigned = signature.formInstance.signatures.find(
        (item) => earlierStages.includes(item.formSignatureStage.stageOrder) && item.status !== "SIGNED"
      )
      if (earliestUnsigned) {
        throw new BadRequestException("An earlier signature stage hasn't been completed yet.")
      }
    }
  }

  async sign(signatureId: string, dto: SignFormDto) {
    const signature = await this.findSignatureOrThrow(signatureId)
    this.assertIsCurrentSigner(signature, dto.actingEmployeeId)

    await this.prisma.formSignature.update({
      where: { id: signatureId },
      data: { status: "SIGNED", signedAt: new Date(), comments: dto.comments, ipAddress: dto.ipAddress },
    })
    await this.log(signature.formInstanceId, "SIGNED", dto.actingEmployeeId, dto.comments)

    await this.advanceInstance(signature.formInstanceId, signature.formSignatureStage.stageOrder)

    return this.prisma.formSignature.findUnique({ where: { id: signatureId }, include: SIGNATURE_INCLUDE })
  }

  async reject(signatureId: string, dto: RejectFormDto) {
    const signature = await this.findSignatureOrThrow(signatureId)
    this.assertIsCurrentSigner(signature, dto.actingEmployeeId)

    await this.prisma.$transaction([
      this.prisma.formSignature.update({
        where: { id: signatureId },
        data: { status: "REJECTED", signedAt: new Date(), comments: dto.comments },
      }),
      this.prisma.formInstance.update({
        where: { id: signature.formInstanceId },
        data: { status: "REJECTED", rejectedAt: new Date(), rejectionComment: dto.comments },
      }),
    ])
    await this.log(signature.formInstanceId, "REJECTED", dto.actingEmployeeId, dto.comments)
    await this.notify(
      signature.formInstance.employee.employeeNumber,
      "FORM_REJECTED",
      "Form rejected",
      `"${signature.formInstance.formTemplate.title}" was rejected: ${dto.comments}`
    )
    const approver = await this.prisma.employee.findUnique({ where: { employeeNumber: dto.actingEmployeeId }, select: { firstName: true, lastName: true } })
    await this.notifyEmail(signature.formInstance.employee.employeeNumber, "approval_rejected", {
      requester_name: `${signature.formInstance.employee.firstName} ${signature.formInstance.employee.lastName}`,
      item_title: signature.formInstance.formTemplate.title,
      item_type: "Form",
      approver_name: approver ? `${approver.firstName} ${approver.lastName}` : "HR",
      decision_comment: dto.comments ?? "No reason provided.",
    })

    return this.prisma.formSignature.findUnique({ where: { id: signatureId }, include: SIGNATURE_INCLUDE })
  }

  /** Sends the form back to the employee for correction — the instance
   *  returns to IN_PROGRESS so they can edit responses, and this signature
   *  resets to PENDING once they resubmit (see FormInstancesService.submit). */
  async returnForCorrection(signatureId: string, dto: RejectFormDto) {
    const signature = await this.findSignatureOrThrow(signatureId)
    this.assertIsCurrentSigner(signature, dto.actingEmployeeId)

    await this.prisma.$transaction([
      this.prisma.formSignature.update({
        where: { id: signatureId },
        data: { status: "RETURNED_FOR_CORRECTION", comments: dto.comments },
      }),
      this.prisma.formInstance.update({ where: { id: signature.formInstanceId }, data: { status: "IN_PROGRESS" } }),
    ])
    await this.log(signature.formInstanceId, "RETURNED_FOR_CORRECTION", dto.actingEmployeeId, dto.comments)
    const returner = await this.prisma.employee.findUnique({ where: { employeeNumber: dto.actingEmployeeId }, select: { firstName: true, lastName: true } })
    await this.notifyEmail(signature.formInstance.employee.employeeNumber, "approval_returned_for_correction", {
      requester_name: `${signature.formInstance.employee.firstName} ${signature.formInstance.employee.lastName}`,
      item_title: signature.formInstance.formTemplate.title,
      item_type: "Form",
      approver_name: returner ? `${returner.firstName} ${returner.lastName}` : "HR",
      decision_comment: dto.comments ?? "No notes provided.",
    })

    return this.prisma.formSignature.findUnique({ where: { id: signatureId }, include: SIGNATURE_INCLUDE })
  }

  /** After a signature completes, checks whether every signature at its
   *  stageOrder is now SIGNED — if so, either notifies the next stage's
   *  signers (already-resolved ones) or marks the instance COMPLETED if
   *  this was the last stage. */
  private async advanceInstance(formInstanceId: string, completedStageOrder: number) {
    const instance = await this.prisma.formInstance.findUniqueOrThrow({
      where: { id: formInstanceId },
      include: {
        formTemplate: { include: { signatureStages: { orderBy: { stageOrder: "asc" } } } },
        signatures: { include: { formSignatureStage: true } },
      },
    })

    const stillPendingAtThisStage = instance.signatures.some(
      (signature) => signature.formSignatureStage.stageOrder === completedStageOrder && signature.status === "PENDING"
    )
    if (stillPendingAtThisStage) return // other parallel signers at this stage haven't finished yet

    const laterStageOrders = instance.formTemplate.signatureStages
      .map((stage) => stage.stageOrder)
      .filter((order) => order > completedStageOrder)

    if (laterStageOrders.length === 0) {
      await this.prisma.formInstance.update({ where: { id: formInstanceId }, data: { status: "COMPLETED", completedAt: new Date() } })
      await this.log(formInstanceId, "COMPLETED", null)
      await this.notify(instance.employeeId, "FORM_COMPLETED", "Form completed", `"${instance.formTemplate.title}" is now fully signed and complete.`)
      const owner = await this.prisma.employee.findUnique({ where: { employeeNumber: instance.employeeId }, select: { firstName: true, lastName: true } })
      await this.notifyEmail(instance.employeeId, "approval_completed", {
        requester_name: owner ? `${owner.firstName} ${owner.lastName}` : instance.employeeId,
        item_title: instance.formTemplate.title,
        item_type: "Form",
        approver_name: "All signers",
      })
      return
    }

    const nextStageOrder = Math.min(...laterStageOrders)
    const nextSigners = instance.signatures.filter((signature) => signature.formSignatureStage.stageOrder === nextStageOrder && signature.signerId)
    for (const signature of nextSigners) {
      await this.notify(signature.signerId as string, "FORM_SIGNATURE_REQUIRED", "Signature required", "A form needs your signature.")
      const signer = await this.prisma.employee.findUnique({ where: { employeeNumber: signature.signerId as string }, select: { firstName: true, lastName: true } })
      await this.notifyEmail(signature.signerId as string, "approval_required", {
        approver_name: signer ? `${signer.firstName} ${signer.lastName}` : (signature.signerId as string),
        item_title: instance.formTemplate.title,
        item_type: "Form",
        approval_url: buildClientUrl("/staff/forms"),
      })
    }
  }

  private async notify(recipientEmployeeId: string, type: "FORM_SIGNATURE_REQUIRED" | "FORM_COMPLETED" | "FORM_REJECTED", title: string, message: string) {
    await this.prisma.notification.create({ data: { recipientEmployeeId, type, title, message } })
  }

  /** The generic approval_* email templates (approval_required/completed/
   *  rejected/returned_for_correction) — the spec frames these as
   *  applicable "across Leave/Recruitment/Forms/Training/Performance/
   *  Employee changes", but Leave and Performance already have their own
   *  more specific templates wired at their own call sites (leave_approved,
   *  performance_reminder_*, etc.), so FormInstance's multi-stage signature
   *  workflow — already the generic, cross-module approval mechanism this
   *  app uses for Exit Clearance, onboarding documents, and any other form
   *  — is the natural, and only, place these generic ones are fired from. */
  private async notifyEmail(recipientEmployeeId: string, templateKey: string, variables: Record<string, string | number | undefined>) {
    const recipient = await this.prisma.employee.findUnique({ where: { employeeNumber: recipientEmployeeId }, select: { email: true } })
    if (!recipient) return
    try {
      await this.emailService.enqueue({
        templateKey,
        recipientEmail: recipient.email,
        recipientEmployeeId,
        relatedModule: "forms",
        relatedEntityId: recipientEmployeeId,
        variables,
      })
    } catch {
      // EmailService.enqueue() already logs internally.
    }
  }

  private async log(id: string, action: string, actorId: string | null, notes?: string) {
    await this.prisma.formAuditLog.create({ data: { entityType: "FormInstance", entityId: id, action, actorId, notes: notes || null } })
  }
}
