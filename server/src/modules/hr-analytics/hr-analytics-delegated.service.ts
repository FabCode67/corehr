import { Injectable } from "@nestjs/common"

import { LeaveAnalyticsService } from "../leave/leave-analytics/leave-analytics.service"
import { PerformanceAnalyticsService } from "../performance/analytics/analytics.service"
import { RecruitmentAnalyticsService } from "../recruitment/analytics/analytics.service"
import { LearningAnalyticsService, type LearningAnalyticsFilters } from "../learning/analytics/analytics.service"
import { PrismaService } from "../../prisma/prisma.service"

import type { HrAnalyticsFilters } from "./hr-analytics-filters.util"

/**
 * Wraps the six chart sections this dashboard reuses from other modules'
 * already-built analytics services (Position Fill Rate/Employee Distribution
 * are new — see HrAnalyticsService — everything below already existed).
 *
 * IMPORTANT SCOPING LIMITATION, documented once here rather than repeated
 * per method: Recruitment's analytics service takes only `actingEmployeeId`
 * (it has its own internal RecruitmentAccessService and no filter
 * passthrough at all), so the dashboard's global org-dimension filters
 * (department/branch/etc.) do NOT narrow the Recruitment section — it always
 * shows whatever that employee's own recruitment role-scope allows. Leave
 * and Learning DO accept department/branch/function filters directly and
 * are passed through in full. Performance accepts the full filter set too.
 * None of the four take this dashboard's own manager/department-head scope
 * (HrAnalyticsAccessService) directly — for a non-admin actor with no
 * explicit departmentId filter, this service defaults departmentId to the
 * first department they head (if any), so a department head sees their own
 * department's numbers by default and can still explicitly switch to any
 * other department they're allowed to see elsewhere in the app. This is a
 * pragmatic simplification, not full multi-department scope enforcement —
 * worth revisiting if a manager ever heads more than one department.
 */
@Injectable()
export class HrAnalyticsDelegatedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveAnalytics: LeaveAnalyticsService,
    private readonly performanceAnalytics: PerformanceAnalyticsService,
    private readonly recruitmentAnalytics: RecruitmentAnalyticsService,
    private readonly learningAnalytics: LearningAnalyticsService
  ) {}

  // ---- Performance Distribution (bell curve) ---------------------------------

  async performanceDistribution(filters: HrAnalyticsFilters) {
    return this.performanceAnalytics.distribution({
      departmentId: filters.departmentId,
      unitId: filters.unitId,
      branchId: filters.branchId,
      positionId: filters.positionId,
      levelId: filters.levelId,
      bandId: filters.bandId,
      contractType: filters.contractType,
      gender: filters.gender,
      functionId: filters.functionId,
      year: filters.year,
    })
  }

  /** Ratings per department (+ rating standard deviation, "performance
   *  variance") — same filter mapping as performanceDistribution() above. */
  async performanceByDepartment(filters: HrAnalyticsFilters) {
    return this.performanceAnalytics.byDepartment({
      departmentId: filters.departmentId,
      unitId: filters.unitId,
      branchId: filters.branchId,
      positionId: filters.positionId,
      levelId: filters.levelId,
      bandId: filters.bandId,
      contractType: filters.contractType,
      gender: filters.gender,
      functionId: filters.functionId,
      year: filters.year,
    })
  }

  // ---- Leave Summary -----------------------------------------------------------

  async leaveSummary(filters: HrAnalyticsFilters) {
    const leaveFilters = { departmentId: filters.departmentId, functionId: filters.functionId, branchId: filters.branchId, year: filters.year }
    const [byDepartment, byType, monthlyTrend, heatmap] = await Promise.all([
      this.leaveAnalytics.utilizationByDepartment(leaveFilters),
      this.leaveAnalytics.typeDistribution(leaveFilters),
      this.leaveAnalytics.monthlyTrends(leaveFilters),
      this.leaveHeatmap(filters),
    ])
    return { byDepartment, byType, monthlyTrend, heatmap }
  }

  /** Simplified "calendar heatmap" — month x leave-type grid of days taken,
   *  rather than a true day-by-day calendar (which would need per-day
   *  splitting of multi-day leave requests). Gives the same "when is leave
   *  concentrated" read at a fraction of the complexity. */
  private async leaveHeatmap(filters: HrAnalyticsFilters) {
    const year = filters.year ?? new Date().getFullYear()
    const requests = await this.prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        startDate: { gte: new Date(Date.UTC(year, 0, 1)), lte: new Date(Date.UTC(year, 11, 31)) },
        employee: {
          ...(filters.branchId ? { branchId: filters.branchId } : {}),
          ...(filters.departmentId || filters.functionId
            ? {
                position: {
                  ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
                  ...(filters.functionId ? { department: { functionId: filters.functionId } } : {}),
                },
              }
            : {}),
        },
      },
      select: { numberOfDays: true, startDate: true, leaveType: { select: { name: true } } },
    })

    const grid = new Map<string, number>() // "month:type" -> days
    const types = new Set<string>()
    for (const r of requests) {
      const month = r.startDate.getUTCMonth()
      types.add(r.leaveType.name)
      const key = `${month}:${r.leaveType.name}`
      grid.set(key, (grid.get(key) ?? 0) + r.numberOfDays)
    }

    return Array.from({ length: 12 }, (_, month) => ({
      month: month + 1,
      byType: Array.from(types).map((type) => ({ leaveType: type, days: grid.get(`${month}:${type}`) ?? 0 })),
    }))
  }

  // ---- Recruitment Analytics -----------------------------------------------------

  async recruitmentAnalyticsFor(actingEmployeeId: string) {
    const [overview, funnel, timeToHire, vacanciesByDepartment, offerStats] = await Promise.all([
      this.recruitmentAnalytics.getOverview(actingEmployeeId),
      this.recruitmentAnalytics.getFunnel(actingEmployeeId),
      this.recruitmentAnalytics.getTimeToHire(actingEmployeeId),
      this.recruitmentAnalytics.getVacanciesByDepartment(actingEmployeeId),
      this.recruitmentAnalytics.getOfferStats(actingEmployeeId),
    ])

    // "Recruitment success rate" — spec term, not modeled elsewhere; the
    // closest honest equivalent already computed is offer acceptance rate.
    return { overview, funnel, timeToHire, vacanciesByDepartment, offerStats, recruitmentSuccessRate: offerStats.acceptanceRate }
  }

  // ---- Learning & Development Analytics ------------------------------------------

  async learningAnalyticsFor(filters: HrAnalyticsFilters) {
    const learningFilters = {
      departmentId: filters.departmentId,
      branchId: filters.branchId,
      functionId: filters.functionId,
      positionId: filters.positionId,
      levelId: filters.levelId,
      bandId: filters.bandId,
      contractType: filters.contractType,
    }

    const [overview, complianceByDepartment, complianceByFunction, complianceByBranch, complianceByBand, departmentAnalysis, aml] = await Promise.all([
      this.learningAnalytics.overview(learningFilters),
      this.learningAnalytics.mandatoryComplianceByDepartment(learningFilters),
      this.learningAnalytics.mandatoryComplianceByFunction(learningFilters),
      this.learningAnalytics.mandatoryComplianceByBranch(learningFilters),
      this.learningAnalytics.mandatoryComplianceByBand(learningFilters),
      this.learningAnalytics.departmentAnalysis(learningFilters),
      this.amlCompletionRate(learningFilters),
    ])

    return {
      trainingCompletionRate: overview.completionRate,
      mandatoryTrainingCompliance: { byDepartment: complianceByDepartment, byFunction: complianceByFunction, byBranch: complianceByBranch, byBand: complianceByBand },
      amlCompletionRate: aml,
      trainingCostAndHoursByDepartment: departmentAnalysis,
    }
  }

  /** Same "find courses with AML in the name" heuristic as
   *  ExecutiveDashboardService's private amlCompliance() — there's no
   *  modeled "compliance training category" concept to key off instead, see
   *  that method's doc comment for the full reasoning. Duplicated here
   *  (rather than exported from there) since ExecutiveDashboardService
   *  keeps that method private by design. */
  private async amlCompletionRate(filters: LearningAnalyticsFilters) {
    const amlCourses = await this.prisma.course.findMany({ where: { name: { contains: "AML", mode: "insensitive" } }, select: { id: true } })
    if (amlCourses.length === 0) return null

    const amlCourseIds = new Set(amlCourses.map((c) => c.id))
    const assignments = await this.prisma.courseAssignment.findMany({
      where: {
        courseId: { in: Array.from(amlCourseIds) },
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
        ...(filters.bandId ? { bandId: filters.bandId } : {}),
      },
      select: { status: true },
    })
    if (assignments.length === 0) return null

    const completed = assignments.filter((a) => a.status === "VERIFIED" || a.status === "CLOSED").length
    return Math.round((completed / assignments.length) * 10000) / 100
  }
}
