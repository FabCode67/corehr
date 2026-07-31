import { Injectable, NotFoundException } from "@nestjs/common"

import { Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

export interface HrAnalyticsScope {
  /** Admin — no restriction, organization-wide access per spec. */
  allowAll: boolean
  /** Executive — treated the same as allowAll for this dashboard: the spec
   *  distinguishes "HR Administrators" from "Executives" only by intent
   *  (operational vs strategic), not by what data either can see, and this
   *  app has no separate "executive" role flag to key off — both map to
   *  isAdmin. */
  isExecutive: boolean
  /** Manager — self + direct reports, resolved via Position.reportsToPositionId. */
  employeeIds: string[]
  /** Departments this employee is the automatically-derived head of. */
  departmentIds: string[]
}

/**
 * Role-scoping for the HR Analytics Dashboard, mirroring the established
 * pattern (PerformanceAccessService / RecruitmentAccessService / etc.):
 *   - HR Administrator: organization-wide access (isAdmin).
 *   - Manager / Department Head: their department/team only — resolved the
 *     same way as every other module, no new role column.
 *   - Employee: not handled here — per spec, "Employees: Personal analytics
 *     only" is a different, much smaller surface than this HR-facing
 *     dashboard (own tenure/leave/training, no org-wide charts), and isn't
 *     built in this pass — see the module doc comment in hr-analytics.module.ts.
 *
 * Delegated sections (Recruitment/Learning/Performance/Leave analytics) each
 * have their own pre-existing access scoping baked into their services —
 * this scope is used only for the KPIs/charts built directly against
 * Employee in HrAnalyticsService, and to pick a default department filter
 * when delegating to those other services for a non-admin actor (see
 * HrAnalyticsDelegatedService's doc comment for that specific limitation).
 */
@Injectable()
export class HrAnalyticsAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveScope(actingEmployeeId: string): Promise<HrAnalyticsScope> {
    const actor = await this.prisma.employee.findUnique({
      where: { employeeNumber: actingEmployeeId },
      include: { position: true },
    })
    if (!actor) throw new NotFoundException(`Employee ${actingEmployeeId} not found`)

    if (actor.isAdmin) {
      return { allowAll: true, isExecutive: true, employeeIds: [], departmentIds: [] }
    }

    const [directReportIds, departmentIds] = await Promise.all([
      this.getDirectReportIds(actingEmployeeId, actor.positionId),
      this.getHeadedDepartmentIds(actor.positionId, actor.position?.departmentId ?? null),
    ])

    return {
      allowAll: false,
      isExecutive: false,
      employeeIds: [actingEmployeeId, ...directReportIds],
      departmentIds,
    }
  }

  async getDirectReportIds(managerId: string, managerPositionId: string | null): Promise<string[]> {
    const overrideReports = await this.prisma.employee.findMany({
      where: { reportingManagerOverrideId: managerId },
      select: { employeeNumber: true },
    })

    let positionReports: { employeeNumber: string }[] = []
    if (managerPositionId) {
      positionReports = await this.prisma.employee.findMany({
        where: { position: { reportsToPositionId: managerPositionId }, reportingManagerOverrideId: null },
        select: { employeeNumber: true },
      })
    }

    return Array.from(new Set([...overrideReports.map((e) => e.employeeNumber), ...positionReports.map((e) => e.employeeNumber)]))
  }

  async getHeadedDepartmentIds(positionId: string | null, departmentId: string | null): Promise<string[]> {
    if (!positionId || !departmentId) return []

    const position = await this.prisma.position.findUnique({ where: { id: positionId } })
    if (!position) return []

    if (!position.reportsToPositionId) return [departmentId]

    const parent = await this.prisma.position.findUnique({ where: { id: position.reportsToPositionId } })
    if (!parent || parent.departmentId !== departmentId) return [departmentId]

    return []
  }

  /** Prisma where-clause fragment enforcing scope on any Employee query. */
  buildEmployeeWhere(scope: HrAnalyticsScope): Prisma.EmployeeWhereInput {
    if (scope.allowAll) return {}

    return {
      OR: [
        ...(scope.employeeIds.length ? [{ employeeNumber: { in: scope.employeeIds } }] : []),
        ...(scope.departmentIds.length ? [{ position: { departmentId: { in: scope.departmentIds } } }] : []),
      ],
    }
  }
}
