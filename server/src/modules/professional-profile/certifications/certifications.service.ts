import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import type { EmployeeCertification } from "@prisma/client"

import { buildClientUrl } from "../../../common/client-url.util"
import { PrismaService } from "../../../prisma/prisma.service"
import { EmailService } from "../../email/email.service"
import { CreateCertificationDto } from "./dto/create-certification.dto"
import { ReviewCertificationDto } from "./dto/review-certification.dto"
import { UpdateCertificationDto } from "./dto/update-certification.dto"

const CERTIFICATION_INCLUDE = {
  addedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
  verifiedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
} as const

/** Active/Expired is computed on read, never stored — see the model's doc
 *  comment in schema.prisma. */
function withStatus<T extends EmployeeCertification>(cert: T) {
  const status = cert.expiryDate && cert.expiryDate < new Date() ? ("EXPIRED" as const) : ("ACTIVE" as const)
  return { ...cert, status }
}

@Injectable()
export class CertificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  async listForEmployee(employeeId: string) {
    const records = await this.prisma.employeeCertification.findMany({
      where: { employeeId },
      include: CERTIFICATION_INCLUDE,
      orderBy: { issueDate: "desc" },
    })
    return records.map(withStatus)
  }

  listPendingReview() {
    return this.prisma.employeeCertification.findMany({
      where: { verificationStatus: "PENDING_REVIEW" },
      include: {
        ...CERTIFICATION_INCLUDE,
        employee: { select: { employeeNumber: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    })
  }

  async findOne(id: string) {
    const record = await this.prisma.employeeCertification.findUnique({ where: { id }, include: CERTIFICATION_INCLUDE })
    if (!record) throw new NotFoundException(`Certification ${id} not found`)
    return withStatus(record)
  }

  async create(dto: CreateCertificationDto) {
    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: dto.actingEmployeeId }, select: { isAdmin: true } })
    if (!actor) throw new BadRequestException("Acting employee not found.")

    const isSelfService = dto.actingEmployeeId === dto.employeeId && !actor.isAdmin

    const record = await this.prisma.employeeCertification.create({
      data: {
        employeeId: dto.employeeId,
        name: dto.name,
        issuer: dto.issuer,
        certificateNumber: dto.certificateNumber,
        issueDate: dto.issueDate,
        expiryDate: dto.expiryDate,
        certificateUrl: dto.certificateUrl,
        certificateFileName: dto.certificateFileName,
        certificateUploadedAt: dto.certificateUrl ? new Date() : undefined,
        addedById: dto.actingEmployeeId,
        verificationStatus: actor.isAdmin ? "VERIFIED" : "PENDING_REVIEW",
        ...(actor.isAdmin ? { verifiedById: dto.actingEmployeeId, verifiedAt: new Date() } : {}),
      },
      include: CERTIFICATION_INCLUDE,
    })

    if (isSelfService) {
      await this.notifyHrPendingReview(dto.employeeId, record.name)
    }

    return withStatus(record)
  }

  async update(id: string, dto: UpdateCertificationDto) {
    const existing = await this.findOne(id)
    const wasReviewed = existing.verificationStatus !== "PENDING_REVIEW"

    const updated = await this.prisma.employeeCertification.update({
      where: { id },
      data: {
        name: dto.name,
        issuer: dto.issuer,
        certificateNumber: dto.certificateNumber,
        issueDate: dto.issueDate,
        expiryDate: dto.expiryDate,
        certificateUrl: dto.certificateUrl,
        certificateFileName: dto.certificateFileName,
        certificateUploadedAt: dto.certificateUrl ? new Date() : undefined,
        ...(wasReviewed ? { verificationStatus: "PENDING_REVIEW", verifiedById: null, verifiedAt: null, hrComment: null } : {}),
      },
      include: CERTIFICATION_INCLUDE,
    })
    return withStatus(updated)
  }

  async remove(id: string, employeeId: string) {
    const record = await this.findOne(id)
    if (record.employeeId !== employeeId) {
      throw new NotFoundException(`Certification ${id} not found for this employee`)
    }
    await this.prisma.employeeCertification.delete({ where: { id } })
  }

  async review(id: string, dto: ReviewCertificationDto) {
    const record = await this.findOne(id)
    if (record.verificationStatus !== "PENDING_REVIEW") {
      throw new BadRequestException("This record has already been reviewed.")
    }
    const reviewer = await this.prisma.employee.findUnique({ where: { employeeNumber: dto.actingEmployeeId }, select: { isAdmin: true } })
    if (!reviewer?.isAdmin) throw new BadRequestException("Only an HR administrator can review certifications.")

    const updated = await this.prisma.employeeCertification.update({
      where: { id },
      data: { verificationStatus: dto.decision, verifiedById: dto.actingEmployeeId, verifiedAt: new Date(), hrComment: dto.comment },
      include: { ...CERTIFICATION_INCLUDE, employee: { select: { employeeNumber: true, firstName: true, lastName: true, email: true } } },
    })

    await this.prisma.notification.create({
      data: {
        recipientEmployeeId: updated.employee.employeeNumber,
        type: dto.decision === "VERIFIED" ? "CERTIFICATION_VERIFIED" : "CERTIFICATION_REJECTED",
        title: dto.decision === "VERIFIED" ? "Certification verified" : "Certification rejected",
        message:
          dto.decision === "VERIFIED"
            ? `"${updated.name}" has been verified by HR.`
            : `"${updated.name}" was rejected by HR.${dto.comment ? ` Reason: ${dto.comment}` : ""}`,
        actionUrl: "/staff/professional-profile",
      },
    })

    try {
      await this.emailService.enqueue({
        templateKey: dto.decision === "VERIFIED" ? "approval_completed" : "approval_rejected",
        recipientEmail: updated.employee.email,
        recipientEmployeeId: updated.employee.employeeNumber,
        relatedModule: "professional-profile",
        relatedEntityId: id,
        variables: {
          requester_name: `${updated.employee.firstName} ${updated.employee.lastName}`,
          item_title: updated.name,
          item_type: "Certification",
          approver_name: "HR",
          decision_comment: dto.comment ?? "No comment provided.",
          item_url: buildClientUrl("/staff/professional-profile"),
        },
      })
    } catch {
      // EmailService.enqueue() already logs internally.
    }

    return withStatus(updated)
  }

  private async notifyHrPendingReview(employeeId: string, certName: string) {
    const [employee, admins] = await Promise.all([
      this.prisma.employee.findUnique({ where: { employeeNumber: employeeId }, select: { firstName: true, lastName: true } }),
      this.prisma.employee.findMany({ where: { isAdmin: true, isActive: true }, select: { employeeNumber: true, email: true } }),
    ])
    if (!employee) return

    await Promise.all([
      this.prisma.notification.createMany({
        data: admins.map((admin) => ({
          recipientEmployeeId: admin.employeeNumber,
          type: "PROFILE_RECORD_PENDING_REVIEW" as const,
          title: "Profile record awaiting review",
          message: `${employee.firstName} ${employee.lastName} submitted a new certification ("${certName}") for review.`,
          relatedEmployeeId: employeeId,
          actionUrl: `/admin/professional-profile/${employeeId}`,
        })),
      }),
      ...admins.map((admin) =>
        this.emailService
          .enqueue({
            templateKey: "approval_required",
            recipientEmail: admin.email,
            recipientEmployeeId: admin.employeeNumber,
            relatedModule: "professional-profile",
            variables: {
              approver_name: admin.email,
              item_title: `${certName} (${employee.firstName} ${employee.lastName})`,
              item_type: "Certification",
              approval_url: buildClientUrl(`/admin/professional-profile/${employeeId}`),
            },
          })
          .catch(() => undefined)
      ),
    ])
  }
}
