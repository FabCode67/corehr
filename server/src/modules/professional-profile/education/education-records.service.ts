import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"

import { buildClientUrl } from "../../../common/client-url.util"
import { PrismaService } from "../../../prisma/prisma.service"
import { EmailService } from "../../email/email.service"
import { CreateEducationRecordDto } from "./dto/create-education-record.dto"
import { ReviewEducationRecordDto } from "./dto/review-education-record.dto"
import { UpdateEducationRecordDto } from "./dto/update-education-record.dto"

const EDUCATION_INCLUDE = {
  institutionRef: true,
  addedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
  verifiedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
} as const

@Injectable()
export class EducationRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  listForEmployee(employeeId: string) {
    return this.prisma.employeeEducation.findMany({
      where: { employeeId },
      include: EDUCATION_INCLUDE,
      orderBy: [{ startDate: "desc" }],
    })
  }

  listPendingReview() {
    return this.prisma.employeeEducation.findMany({
      where: { verificationStatus: "PENDING_REVIEW" },
      include: {
        ...EDUCATION_INCLUDE,
        employee: { select: { employeeNumber: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    })
  }

  async findOne(id: string) {
    const record = await this.prisma.employeeEducation.findUnique({ where: { id }, include: EDUCATION_INCLUDE })
    if (!record) throw new NotFoundException(`Education record ${id} not found`)
    return record
  }

  async create(dto: CreateEducationRecordDto) {
    if (!dto.institutionId && !dto.institutionName) {
      throw new BadRequestException("Either institutionId or institutionName is required.")
    }

    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: dto.actingEmployeeId }, select: { isAdmin: true } })
    if (!actor) throw new BadRequestException("Acting employee not found.")

    let institutionName = dto.institutionName
    let country = dto.country
    if (dto.institutionId) {
      const institution = await this.prisma.academicInstitution.findUnique({ where: { id: dto.institutionId } })
      if (!institution) throw new NotFoundException(`Institution ${dto.institutionId} not found`)
      institutionName = institution.name
      country = country ?? institution.country ?? undefined
    }

    const isSelfService = dto.actingEmployeeId === dto.employeeId && !actor.isAdmin

    const record = await this.prisma.employeeEducation.create({
      data: {
        employeeId: dto.employeeId,
        type: dto.type,
        title: dto.title,
        institution: institutionName!,
        institutionId: dto.institutionId,
        country,
        fieldOfStudy: dto.fieldOfStudy,
        grade: dto.grade,
        startDate: dto.startDate,
        endDate: dto.endDate,
        graduationDate: dto.graduationDate,
        certificateUrl: dto.certificateUrl,
        certificateFileName: dto.certificateFileName,
        certificateUploadedAt: dto.certificateUrl ? new Date() : undefined,
        description: dto.description,
        addedById: dto.actingEmployeeId,
        verificationStatus: actor.isAdmin ? "VERIFIED" : "PENDING_REVIEW",
        ...(actor.isAdmin ? { verifiedById: dto.actingEmployeeId, verifiedAt: new Date() } : {}),
      },
      include: EDUCATION_INCLUDE,
    })

    if (isSelfService) {
      await this.notifyHrPendingReview(dto.employeeId, "education", record.title)
    }

    return record
  }

  async update(id: string, dto: UpdateEducationRecordDto) {
    const existing = await this.findOne(id)

    let institutionName = dto.institutionName
    let institutionId = dto.institutionId
    let country = dto.country
    if (dto.institutionId) {
      const institution = await this.prisma.academicInstitution.findUnique({ where: { id: dto.institutionId } })
      if (!institution) throw new NotFoundException(`Institution ${dto.institutionId} not found`)
      institutionName = institution.name
      country = country ?? institution.country ?? undefined
    }

    const wasReviewed = existing.verificationStatus !== "PENDING_REVIEW"

    return this.prisma.employeeEducation.update({
      where: { id },
      data: {
        type: dto.type,
        title: dto.title,
        institution: institutionName,
        institutionId,
        country,
        fieldOfStudy: dto.fieldOfStudy,
        grade: dto.grade,
        startDate: dto.startDate,
        endDate: dto.endDate,
        graduationDate: dto.graduationDate,
        certificateUrl: dto.certificateUrl,
        certificateFileName: dto.certificateFileName,
        certificateUploadedAt: dto.certificateUrl ? new Date() : undefined,
        description: dto.description,
        // Edits to an already-reviewed record need a fresh HR look — see
        // this DTO's doc comment.
        ...(wasReviewed ? { verificationStatus: "PENDING_REVIEW", verifiedById: null, verifiedAt: null, hrComment: null } : {}),
      },
      include: EDUCATION_INCLUDE,
    })
  }

  async remove(id: string, employeeId: string) {
    const record = await this.findOne(id)
    if (record.employeeId !== employeeId) {
      throw new NotFoundException(`Education record ${id} not found for this employee`)
    }
    await this.prisma.employeeEducation.delete({ where: { id } })
  }

  async review(id: string, dto: ReviewEducationRecordDto) {
    const record = await this.findOne(id)
    if (record.verificationStatus !== "PENDING_REVIEW") {
      throw new BadRequestException("This record has already been reviewed.")
    }
    const reviewer = await this.prisma.employee.findUnique({ where: { employeeNumber: dto.actingEmployeeId }, select: { isAdmin: true } })
    if (!reviewer?.isAdmin) throw new BadRequestException("Only an HR administrator can review education records.")

    const updated = await this.prisma.employeeEducation.update({
      where: { id },
      data: { verificationStatus: dto.decision, verifiedById: dto.actingEmployeeId, verifiedAt: new Date(), hrComment: dto.comment },
      include: { ...EDUCATION_INCLUDE, employee: { select: { employeeNumber: true, firstName: true, lastName: true, email: true } } },
    })

    await this.notifyEmployeeReviewed(updated.employee, updated.title, dto.decision, dto.comment, id)

    return updated
  }

  private async notifyHrPendingReview(employeeId: string, recordType: string, title: string) {
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
          message: `${employee.firstName} ${employee.lastName} submitted a new ${recordType} record ("${title}") for review.`,
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
              item_title: `${title} (${employee.firstName} ${employee.lastName})`,
              item_type: recordType === "education" ? "Education record" : "Certification",
              approval_url: buildClientUrl(`/admin/professional-profile/${employeeId}`),
            },
          })
          .catch(() => undefined)
      ),
    ])
  }

  private async notifyEmployeeReviewed(
    employee: { employeeNumber: string; firstName: string; lastName: string; email: string },
    title: string,
    decision: "VERIFIED" | "REJECTED",
    comment: string | undefined,
    entityId: string
  ) {
    await this.prisma.notification.create({
      data: {
        recipientEmployeeId: employee.employeeNumber,
        type: decision === "VERIFIED" ? "EDUCATION_VERIFIED" : "EDUCATION_REJECTED",
        title: decision === "VERIFIED" ? "Education record verified" : "Education record rejected",
        message:
          decision === "VERIFIED"
            ? `"${title}" has been verified by HR.`
            : `"${title}" was rejected by HR.${comment ? ` Reason: ${comment}` : ""}`,
        actionUrl: "/staff/professional-profile",
      },
    })

    try {
      await this.emailService.enqueue({
        templateKey: decision === "VERIFIED" ? "approval_completed" : "approval_rejected",
        recipientEmail: employee.email,
        recipientEmployeeId: employee.employeeNumber,
        relatedModule: "professional-profile",
        relatedEntityId: entityId,
        variables: {
          requester_name: `${employee.firstName} ${employee.lastName}`,
          item_title: title,
          item_type: "Education record",
          approver_name: "HR",
          decision_comment: comment ?? "No comment provided.",
          item_url: buildClientUrl("/staff/professional-profile"),
        },
      })
    } catch {
      // EmailService.enqueue() already logs internally.
    }
  }
}
