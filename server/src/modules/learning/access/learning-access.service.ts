import { Injectable, NotFoundException } from "@nestjs/common"

import { Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

export interface LearningAccessScope {
  /** Admin — no restriction, sees every assignment. */
  allowAll: boolean
  /** Self + anyone directly reporting to this employee. */
  employeeIds: string[]
  /** Departments this employee is the automatically-derived head of. */
  departmentIds: string[]
}

/**
 * Resolves who an acting employee is allowed to see/act on for Learning &
 * Development, per the same three-tier model as Performance Management
 * (Admin: org-wide; Department Head: derived automatically from the
 * Position tree; Manager: self + direct reports). Deliberately mirrors
 * PerformanceAccessService rather than importing it, to keep the Learning
 * and Performance modules independent of each other (same reasoning
 * leave-requests.service.ts gives for duplicating resolveLineManagerId
 * instead of depending on EmployeesModule).
 */
@Injectable()
export class LearningAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveScope(actingEmployeeId: string): Promise<LearningAccessScope> {
    const actor = await this.prisma.employee.findUnique({
      where: { employeeNumber: actingEmployeeId },
      include: { position: true },
    })

    if (!actor) {
      throw new NotFoundException(`Employee ${actingEmployeeId} not found`)
    }

    if (actor.isAdmin) {
      return { allowAll: true, employeeIds: [], departmentIds: [] }
    }

    const [directReportIds, departmentIds] = await Promise.all([
      this.getDirectReportIds(actingEmployeeId, actor.positionId),
      this.getHeadedDepartmentIds(actor.positionId, actor.position?.departmentId ?? null),
    ])

    return {
      allowAll: false,
      employeeIds: [actingEmployeeId, ...directReportIds],
      departmentIds,
    }
  }

  /** Employees whose position reports to this manager's position, plus any documented override exceptions. */
  async getDirectReportIds(managerId: string, managerPositionId: string | null): Promise<string[]> {
    const overrideReports = await this.prisma.employee.findMany({
      where: { reportingManagerOverrideId: managerId },
      select: { employeeNumber: true },
    })

    let positionReports: { employeeNumber: string }[] = []
    if (managerPositionId) {
      positionReports = await this.prisma.employee.findMany({
        where: {
          position: { reportsToPositionId: managerPositionId },
          reportingManagerOverrideId: null,
        },
        select: { employeeNumber: true },
      })
    }

    return Array.from(
      new Set([
        ...overrideReports.map((e) => e.employeeNumber),
        ...positionReports.map((e) => e.employeeNumber),
      ])
    )
  }

  /** Departments this position is the automatically-derived head of. */
  async getHeadedDepartmentIds(positionId: string | null, departmentId: string | null): Promise<string[]> {
    if (!positionId || !departmentId) return []

    const position = await this.prisma.position.findUnique({ where: { id: positionId } })
    if (!position) return []

    if (!position.reportsToPositionId) {
      return [departmentId]
    }

    const parent = await this.prisma.position.findUnique({ where: { id: position.reportsToPositionId } })
    if (!parent || parent.departmentId !== departmentId) {
      return [departmentId]
    }

    return []
  }

  /** Prisma where-clause fragment enforcing a scope on CourseAssignment
   *  queries — uses the assignment's own snapshotted departmentId (the
   *  assigned employee's department at assignment time), not the course's
   *  eligibility restriction, since a Department Head should see every
   *  assignment for their department regardless of what a given course is
   *  restricted to. */
  buildAssignmentWhere(scope: LearningAccessScope): Prisma.CourseAssignmentWhereInput {
    if (scope.allowAll) return {}

    return {
      OR: [
        ...(scope.employeeIds.length ? [{ employeeId: { in: scope.employeeIds } }] : []),
        ...(scope.departmentIds.length ? [{ departmentId: { in: scope.departmentIds } }] : []),
      ],
    }
  }

  canAccessEmployee(scope: LearningAccessScope, employeeId: string) {
    if (scope.allowAll) return true
    return scope.employeeIds.includes(employeeId)
  }
}
