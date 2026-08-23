import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { NotificationType, OnboardingDocumentStatus } from "@prisma/client"

import { NotificationsService } from "../../leave/notifications/notifications.service"
import { PrismaService } from "../../../prisma/prisma.service"

import { BulkAssignDocumentsDto } from "./dto/bulk-assign.dto"
import { ReviewDocumentDto } from "./dto/review-document.dto"
import { UploadDocumentDto } from "./dto/upload-document.dto"

const ASSIGNMENT_INCLUDE = {
  documentType: true,
  employee: { select: { employeeNumber: true, firstName: true, lastName: true } },
  assignedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
  reviewedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
} as const

const OUTSTANDING_STATUSES: OnboardingDocumentStatus[] = ["NOT_STARTED", "UNDER_REVIEW", "REJECTED", "RESUBMISSION_REQUIRED"]

const STATUS_NOTIFICATION: Partial<Record<OnboardingDocumentStatus, NotificationType>> = {
  APPROVED: NotificationType.ONBOARDING_DOCUMENT_APPROVED,
  REJECTED: NotificationType.ONBOARDING_DOCUMENT_REJECTED,
  RESUBMISSION_REQUIRED: NotificationType.ONBOARDING_DOCUMENT_RESUBMISSION_REQUIRED,
}

/**
 * Per-employee onboarding document tracking — assignment (bulk, right after
 * HR creates the employee record), upload, and HR review. Employees can
 * only see/act on their own assignments; HR (Employee.isAdmin) sees and
 * reviews everyone's — a lightweight inline check rather than a dedicated
 * access-scope service, since this module has far fewer visibility rules
 * than Employee Relations.
 */
@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {}

  private async isHr(employeeId: string): Promise<boolean> {
    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: employeeId }, select: { isAdmin: true } })
    return actor?.isAdmin ?? false
  }

  private async findAssignmentOrThrow(id: string) {
    const assignment = await this.prisma.onboardingDocumentAssignment.findUnique({ where: { id }, include: ASSIGNMENT_INCLUDE })
    if (!assignment) {
      throw new NotFoundException(`Onboarding document assignment ${id} not found`)
    }
    return assignment
  }

  async findForEmployee(employeeId: string, actingEmployeeId: string) {
    if (employeeId !== actingEmployeeId && !(await this.isHr(actingEmployeeId))) {
      throw new ForbiddenException("You don't have access to this employee's onboarding documents")
    }
    return this.prisma.onboardingDocumentAssignment.findMany({
      where: { employeeId },
      include: ASSIGNMENT_INCLUDE,
      orderBy: [{ documentType: { name: "asc" } }],
    })
  }

  /** Assigns every selected document type to the employee in one call,
   *  right after HR finishes creating the employee record (see schema
   *  module note on why this isn't wired into EmployeesService.create()
   *  itself). Idempotent per (employee, documentType) via upsert. */
  async bulkAssign(dto: BulkAssignDocumentsDto) {
    const created = []
    for (const documentTypeId of dto.documentTypeIds) {
      const row = await this.prisma.onboardingDocumentAssignment.upsert({
        where: { employeeId_documentTypeId: { employeeId: dto.employeeId, documentTypeId } },
        update: {},
        create: { employeeId: dto.employeeId, documentTypeId, assignedById: dto.assignedById },
        include: ASSIGNMENT_INCLUDE,
      })
      created.push(row)
    }

    if (created.length > 0) {
      await this.notificationsService.create({
        recipientEmployeeId: dto.employeeId,
        type: NotificationType.ONBOARDING_DOCUMENT_ASSIGNED,
        title: "Onboarding documents assigned",
        message: `${created.length} onboarding document(s) have been assigned to you. Check My Onboarding to get started.`,
        actionUrl: "/staff/onboarding",
      })
    }

    return created
  }

  async upload(id: string, dto: UploadDocumentDto) {
    const assignment = await this.findAssignmentOrThrow(id)
    if (assignment.employeeId !== dto.actingEmployeeId) {
      throw new ForbiddenException("Only the employee this document is assigned to can upload it.")
    }

    const updated = await this.prisma.onboardingDocumentAssignment.update({
      where: { id },
      data: { fileUrl: dto.fileUrl, uploadedAt: new Date(), status: "UNDER_REVIEW" },
      include: ASSIGNMENT_INCLUDE,
    })

    await this.notificationsService.createForAllAdmins({
      type: NotificationType.ONBOARDING_DOCUMENT_UPLOADED,
      title: "Onboarding document uploaded",
      message: `${assignment.employee.firstName} ${assignment.employee.lastName} uploaded ${assignment.documentType.name} for review.`,
      actionUrl: "/admin/onboarding-documents",
    })

    return updated
  }

  async review(id: string, dto: ReviewDocumentDto) {
    if (!(await this.isHr(dto.actingEmployeeId))) {
      throw new ForbiddenException("Only HR can review onboarding documents.")
    }
    const assignment = await this.findAssignmentOrThrow(id)

    const updated = await this.prisma.onboardingDocumentAssignment.update({
      where: { id },
      data: { status: dto.status, reviewedById: dto.actingEmployeeId, reviewedAt: new Date(), reviewComments: dto.reviewComments },
      include: ASSIGNMENT_INCLUDE,
    })

    const notificationType = STATUS_NOTIFICATION[dto.status]
    if (notificationType) {
      await this.notificationsService.create({
        recipientEmployeeId: assignment.employeeId,
        type: notificationType,
        title: `Onboarding document ${dto.status.toLowerCase().replaceAll("_", " ")}`,
        message: `${assignment.documentType.name}: ${dto.status === "APPROVED" ? "approved." : dto.reviewComments ? dto.reviewComments : "needs your attention."}`,
        actionUrl: "/staff/onboarding",
      })
    }

    return updated
  }

  /** Percentage completed / remaining / approved / missing — computed on
   *  read, never stored (see schema module note). */
  async getProgress(employeeId: string) {
    const assignments = await this.prisma.onboardingDocumentAssignment.findMany({
      where: { employeeId },
      include: { documentType: true },
    })
    const total = assignments.length
    const approved = assignments.filter((a) => a.status === "APPROVED").length
    const remaining = total - approved
    const missing = assignments
      .filter((a) => OUTSTANDING_STATUSES.includes(a.status))
      .map((a) => ({ id: a.id, documentTypeName: a.documentType.name, status: a.status, isMandatory: a.documentType.isMandatory }))
    const percentageCompleted = total > 0 ? Math.round((approved / total) * 1000) / 10 : 0

    return { total, approved, remaining, percentageCompleted, missing }
  }

  /** HR-facing roster of every active employee with at least one assigned
   *  onboarding document and their completion state — highlights anyone
   *  incomplete. HR-only. */
  async getHrOverview(actingEmployeeId: string) {
    if (!(await this.isHr(actingEmployeeId))) {
      throw new ForbiddenException("Only HR can view the onboarding documents overview.")
    }

    const assignments = await this.prisma.onboardingDocumentAssignment.findMany({
      where: { employee: { isActive: true } },
      include: {
        employee: {
          select: {
            employeeNumber: true,
            firstName: true,
            lastName: true,
            position: { select: { title: true, department: { select: { name: true } } } },
          },
        },
      },
    })

    const byEmployee = new Map<
      string,
      { employeeId: string; employeeName: string; departmentName: string; total: number; approved: number }
    >()
    for (const assignment of assignments) {
      const key = assignment.employeeId
      const entry = byEmployee.get(key) ?? {
        employeeId: key,
        employeeName: `${assignment.employee.firstName} ${assignment.employee.lastName}`,
        departmentName: assignment.employee.position?.department.name ?? "Unassigned",
        total: 0,
        approved: 0,
      }
      entry.total += 1
      if (assignment.status === "APPROVED") entry.approved += 1
      byEmployee.set(key, entry)
    }

    return Array.from(byEmployee.values())
      .map((entry) => ({
        ...entry,
        remaining: entry.total - entry.approved,
        percentageCompleted: entry.total > 0 ? Math.round((entry.approved / entry.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.percentageCompleted - b.percentageCompleted)
  }
}
