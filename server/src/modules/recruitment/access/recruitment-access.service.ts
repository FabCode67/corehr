import { Injectable, NotFoundException } from "@nestjs/common"

import { Prisma, RequisitionStatus } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

const DIRECTOR_VISIBLE_STATUSES: RequisitionStatus[] = ["PENDING_MD_APPROVAL", "PENDING_APPROVAL", "APPROVED", "REJECTED", "CLOSED", "FILLED"]

export interface RecruitmentAccessScope {
  /** Admin — no restriction, sees every recruitment record. */
  allowAll: boolean
  actingEmployeeId: string
  /** Departments this employee is the automatically-derived head of — same
   *  derivation as LearningAccessService/PerformanceAccessService. */
  departmentIds: string[]
  /** Director-level (MD) — sees requisitions awaiting/after MD approval. */
  isDirector?: boolean
}

/**
 * Resolves who an acting employee is allowed to see/act on for Recruitment
 * Management, per the spec's three-tier model: Recruiters see only
 * requisitions/applications assigned to them; Hiring Managers see vacancies
 * and candidates for their department (auto-derived from the Position tree,
 * same as Department Head elsewhere); HR Administrators have org-wide
 * access. Deliberately duplicates LearningAccessService/
 * PerformanceAccessService's derivation logic rather than importing either,
 * for the same cross-module-independence reasoning documented on both.
 */
@Injectable()
export class RecruitmentAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveScope(actingEmployeeId: string): Promise<RecruitmentAccessScope> {
    const actor = await this.prisma.employee.findUnique({
      where: { employeeNumber: actingEmployeeId },
      include: { position: true },
    })

    if (!actor) {
      throw new NotFoundException(`Employee ${actingEmployeeId} not found`)
    }

    if (actor.isAdmin) {
      return { allowAll: true, actingEmployeeId, departmentIds: [] }
    }

    const departmentIds = await this.getHeadedDepartmentIds(actor.positionId, actor.position?.departmentId ?? null)
    const level = actor.position?.levelId
      ? await this.prisma.positionLevel.findUnique({ where: { id: actor.position.levelId }, select: { code: true } })
      : null
    return { allowAll: false, actingEmployeeId, departmentIds, isDirector: level?.code === "E1" }
  }

  /** Departments this position is the automatically-derived head of —
   *  identical logic to LearningAccessService.getHeadedDepartmentIds. */
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

  /** Recruiter/Hiring Manager OR-clause shared by WorkforcePlan and
   *  JobRequisition, both of which carry their own recruiterId/
   *  hiringManagerId/departmentId directly. */
  private ownershipOr(scope: RecruitmentAccessScope) {
    return [
      { recruiterId: scope.actingEmployeeId },
      { hiringManagerId: scope.actingEmployeeId },
      ...(scope.departmentIds.length ? [{ departmentId: { in: scope.departmentIds } }] : []),
    ]
  }

  buildWorkforcePlanWhere(scope: RecruitmentAccessScope): Prisma.WorkforcePlanWhereInput {
    if (scope.allowAll) return {}
    return { OR: this.ownershipOr(scope) }
  }

  buildRequisitionWhere(scope: RecruitmentAccessScope): Prisma.JobRequisitionWhereInput {
    if (scope.allowAll) return {}
    return {
      OR: [
        ...this.ownershipOr(scope),
        ...(scope.isDirector
          ? [{ status: { in: DIRECTOR_VISIBLE_STATUSES } }]
          : []),
      ],
    }
  }

  /** Applications/Assessments/Interviews/BackgroundChecks/Offers/
   *  OnboardingTasks all hang off JobPosting -> JobRequisition, so their
   *  scope is the same ownership check applied through that relation. */
  buildApplicationWhere(scope: RecruitmentAccessScope): Prisma.ApplicationWhereInput {
    if (scope.allowAll) return {}
    return { jobPosting: { requisition: { OR: this.ownershipOr(scope) } } }
  }

  canAccessRequisition(
    scope: RecruitmentAccessScope,
    requisition: { recruiterId: string; hiringManagerId: string; departmentId: string; status?: string }
  ) {
    if (scope.allowAll) return true
    if (scope.isDirector && requisition.status && requisition.status !== "DRAFT" && requisition.status !== "PENDING_HR_REVIEW") return true
    return (
      requisition.recruiterId === scope.actingEmployeeId ||
      requisition.hiringManagerId === scope.actingEmployeeId ||
      scope.departmentIds.includes(requisition.departmentId)
    )
  }
}
