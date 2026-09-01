import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { NotificationType } from "@prisma/client"

import { NotificationsService } from "../../leave/notifications/notifications.service"
import { PrismaService } from "../../../prisma/prisma.service"

import { BulkAssignExitDocumentsDto } from "./dto/bulk-assign-exit-documents.dto"
import { CompleteExitDocumentDto } from "./dto/complete-exit-document.dto"

const ASSIGNMENT_INCLUDE = {
  documentType: true,
  employee: { select: { employeeNumber: true, firstName: true, lastName: true } },
  assignedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
  completedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
} as const

/**
 * Per-employee exit checklist tracking. Deliberately simpler than
 * OnboardingDocuments' AssignmentsService (isCompleted toggle, no
 * upload/review split) — see schema.prisma's Exit Document Management
 * module note. HR (Employee.isAdmin) or the assigned-by actor can complete
 * items; there's no employee self-service surface for these (exit
 * checklist items are things HR/IT/Facilities action, not the departing
 * employee).
 */
@Injectable()
export class ExitDocumentAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {}

  private async isHr(employeeId: string): Promise<boolean> {
    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: employeeId }, select: { isAdmin: true } })
    return actor?.isAdmin ?? false
  }

  private async findAssignmentOrThrow(id: string) {
    const assignment = await this.prisma.exitDocumentAssignment.findUnique({ where: { id }, include: ASSIGNMENT_INCLUDE })
    if (!assignment) {
      throw new NotFoundException(`Exit document assignment ${id} not found`)
    }
    return assignment
  }

  findForEmployee(employeeId: string) {
    return this.prisma.exitDocumentAssignment.findMany({
      where: { employeeId },
      include: ASSIGNMENT_INCLUDE,
      orderBy: [{ documentType: { sortOrder: "asc" } }, { documentType: { name: "asc" } }],
    })
  }

  /** Assigns every selected document type to the employee. Idempotent per
   *  (employee, documentType) via upsert — but unlike onboarding documents,
   *  re-assigning an existing row resets it to incomplete, so a
   *  rehired-then-re-exited employee gets a fresh checklist rather than one
   *  that reads as already-done from a prior stint (see module note). */
  async bulkAssign(dto: BulkAssignExitDocumentsDto) {
    if (!(await this.isHr(dto.assignedById))) {
      throw new ForbiddenException("Only HR can assign exit documents.")
    }
    const created = []
    for (const documentTypeId of dto.documentTypeIds) {
      const row = await this.prisma.exitDocumentAssignment.upsert({
        where: { employeeId_documentTypeId: { employeeId: dto.employeeId, documentTypeId } },
        update: { isCompleted: false, completedAt: null, completedById: null, assignedById: dto.assignedById, assignedAt: new Date() },
        create: { employeeId: dto.employeeId, documentTypeId, assignedById: dto.assignedById },
        include: ASSIGNMENT_INCLUDE,
      })
      created.push(row)
    }
    return created
  }

  async setCompleted(id: string, dto: CompleteExitDocumentDto) {
    if (!(await this.isHr(dto.actingEmployeeId))) {
      throw new ForbiddenException("Only HR can update exit document status.")
    }
    const assignment = await this.findAssignmentOrThrow(id)

    const updated = await this.prisma.exitDocumentAssignment.update({
      where: { id },
      data: {
        isCompleted: dto.isCompleted,
        notes: dto.notes ?? assignment.notes,
        completedById: dto.isCompleted ? dto.actingEmployeeId : null,
        completedAt: dto.isCompleted ? new Date() : null,
      },
      include: ASSIGNMENT_INCLUDE,
    })

    if (dto.isCompleted) {
      await this.notificationsService.create({
        recipientEmployeeId: assignment.employeeId,
        type: NotificationType.EXIT_PROCESS_STARTED,
        title: "Exit document completed",
        message: `${assignment.documentType.name} has been marked complete.`,
        actionUrl: `/admin/employees/${assignment.employeeId}`,
      })
    }

    return updated
  }

  /** Percentage completed / remaining — computed on read, never stored (see
   *  schema module note). Used both for display and as the input to
   *  EmployeesService.processExit()'s completion gate. */
  async getProgress(employeeId: string) {
    const assignments = await this.prisma.exitDocumentAssignment.findMany({
      where: { employeeId },
      include: { documentType: true },
    })
    const total = assignments.length
    const completed = assignments.filter((a) => a.isCompleted).length
    const remaining = total - completed
    const outstanding = assignments
      .filter((a) => !a.isCompleted)
      .map((a) => ({ id: a.id, documentTypeName: a.documentType.name, isMandatory: a.documentType.isMandatory }))
    const percentageCompleted = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0
    const allCompleted = total > 0 && remaining === 0

    return { total, completed, remaining, percentageCompleted, allCompleted, outstanding }
  }
}
