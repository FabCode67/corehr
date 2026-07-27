import { Injectable, NotFoundException } from "@nestjs/common"

import { Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

export interface PerformanceAccessScope {
  /** Admin — no restriction, sees every review. */
  allowAll: boolean
  /** Self + anyone directly reporting to this employee. */
  employeeIds: string[]
  /** Departments this employee is the automatically-derived head of. */
  departmentIds: string[]
}

/**
 * Resolves who an acting employee is allowed to see/act on for Performance
 * Management, per the spec's three-tier model:
 *   - Admin: organization-wide access.
 *   - Department Head: derived automatically (no new role column) — an
 *     employee is treated as head of a department when their Position is
 *     the top of that department's reporting tree, i.e. it has no
 *     reportsToPositionId, or its parent position belongs to a different
 *     department (the boundary between "inside this department" and
 *     "reports up and out of it", e.g. into Executive Management).
 *   - Manager: sees their own record plus direct reports only, resolved via
 *     Position.reportsToPositionId / reportingManagerOverrideId — the exact
 *     mechanism EmployeesService.getReportingManager already uses for the
 *     inverse lookup (employee -> manager).
 */
@Injectable()
export class PerformanceAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveScope(actingEmployeeId: string): Promise<PerformanceAccessScope> {
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

  /** Departments this position is the automatically-derived head of (see class doc). */
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

  /** Prisma where-clause fragment enforcing a scope on PerformanceReview queries. */
  buildReviewWhere(scope: PerformanceAccessScope): Prisma.PerformanceReviewWhereInput {
    if (scope.allowAll) return {}

    return {
      OR: [
        ...(scope.employeeIds.length ? [{ employeeId: { in: scope.employeeIds } }] : []),
        ...(scope.departmentIds.length ? [{ departmentId: { in: scope.departmentIds } }] : []),
      ],
    }
  }

  canAccessEmployee(scope: PerformanceAccessScope, employeeId: string, employeeDepartmentId: string | null) {
    if (scope.allowAll) return true
    if (scope.employeeIds.includes(employeeId)) return true
    if (employeeDepartmentId && scope.departmentIds.includes(employeeDepartmentId)) return true
    return false
  }
}
