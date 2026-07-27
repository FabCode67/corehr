import { Injectable, NotFoundException } from "@nestjs/common"

import { Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

export interface EmployeeRelationsAccessScope {
  /** HR Administrator / Executive — no restriction, sees every case,
   *  investigation, sanction, grievance, and appeal, confidential or not. */
  allowAll: boolean
  actingEmployeeId: string
  /** Direct reports only (not the whole org subtree) — see the schema's
   *  Employee Relations module doc comment on why this mirrors
   *  EmployeesService.getReportingManager()'s resolution logic in reverse. */
  directReportIds: Set<string>
}

/**
 * Resolves who an acting employee is allowed to see/act on for Employee
 * Relations. Three visibility tiers, per the spec and the user's
 * confidentiality-flag decision:
 * - HR Administrators/Executives (isAdmin): everything.
 * - Line managers: non-confidential cases belonging to their direct
 *   reports only — a confidential case is invisible to them regardless of
 *   the reporting line.
 * - Everyone else: only their own cases/grievances/appeals, plus anything
 *   they personally reported or are handling.
 */
@Injectable()
export class EmployeeRelationsAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveScope(actingEmployeeId: string): Promise<EmployeeRelationsAccessScope> {
    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: actingEmployeeId } })
    if (!actor) {
      throw new NotFoundException(`Employee ${actingEmployeeId} not found`)
    }
    if (actor.isAdmin) {
      return { allowAll: true, actingEmployeeId, directReportIds: new Set() }
    }

    const directReportIds = await this.resolveDirectReportIds(actingEmployeeId, actor.positionId)
    return { allowAll: false, actingEmployeeId, directReportIds }
  }

  /** Inverse of EmployeesService.getReportingManager(): an employee reports
   *  to actingEmployeeId if either their override points here, or (absent
   *  an override) their position reports to actingEmployeeId's position. */
  private async resolveDirectReportIds(actingEmployeeId: string, positionId: string | null): Promise<Set<string>> {
    const overrideReports = await this.prisma.employee.findMany({
      where: { reportingManagerOverrideId: actingEmployeeId },
      select: { employeeNumber: true },
    })

    const positionReports = positionId
      ? await this.prisma.employee.findMany({
          where: { position: { reportsToPositionId: positionId }, reportingManagerOverrideId: null },
          select: { employeeNumber: true },
        })
      : []

    return new Set([...overrideReports, ...positionReports].map((employee) => employee.employeeNumber))
  }

  buildCaseWhere(scope: EmployeeRelationsAccessScope): Prisma.DisciplinaryCaseWhereInput {
    if (scope.allowAll) return {}
    return {
      OR: [
        { employeeId: scope.actingEmployeeId },
        { reportedById: scope.actingEmployeeId },
        { isConfidential: false, employeeId: { in: Array.from(scope.directReportIds) } },
      ],
    }
  }

  canAccessCase(scope: EmployeeRelationsAccessScope, disciplinaryCase: { employeeId: string; reportedById: string; isConfidential: boolean }) {
    if (scope.allowAll) return true
    if (disciplinaryCase.employeeId === scope.actingEmployeeId || disciplinaryCase.reportedById === scope.actingEmployeeId) return true
    return !disciplinaryCase.isConfidential && scope.directReportIds.has(disciplinaryCase.employeeId)
  }

  /** Sanctions inherit the same visibility as their parent case: HR sees
   *  everything, a line manager sees non-confidential sanctions for their
   *  direct reports, everyone else only their own. Used by the analytics
   *  service's sanction-breakdown queries. */
  buildSanctionWhere(scope: EmployeeRelationsAccessScope): Prisma.SanctionWhereInput {
    if (scope.allowAll) return {}
    return {
      OR: [
        { employeeId: scope.actingEmployeeId },
        { disciplinaryCase: { isConfidential: false, employeeId: { in: Array.from(scope.directReportIds) } } },
      ],
    }
  }

  /** Grievances are HR-only + the submitter — no line-manager visibility at
   *  all, per the spec's "only authorized HR personnel" rule. */
  buildGrievanceWhere(scope: EmployeeRelationsAccessScope): Prisma.GrievanceWhereInput {
    if (scope.allowAll) return {}
    return { OR: [{ employeeId: scope.actingEmployeeId }, { assignedToId: scope.actingEmployeeId }] }
  }

  canAccessGrievance(scope: EmployeeRelationsAccessScope, grievance: { employeeId: string; assignedToId: string | null }) {
    if (scope.allowAll) return true
    return grievance.employeeId === scope.actingEmployeeId || grievance.assignedToId === scope.actingEmployeeId
  }

  /** Appeals are visible to their own employee and HR only — per the
   *  spec's "employees can only view their own... appeal status" rule; a
   *  line manager reaches appeal info through the case view, not directly. */
  buildAppealWhere(scope: EmployeeRelationsAccessScope): Prisma.AppealWhereInput {
    if (scope.allowAll) return {}
    return { employeeId: scope.actingEmployeeId }
  }

  canAccessAppeal(scope: EmployeeRelationsAccessScope, appeal: { employeeId: string }) {
    if (scope.allowAll) return true
    return appeal.employeeId === scope.actingEmployeeId
  }
}
