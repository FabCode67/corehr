import { Injectable } from "@nestjs/common"

import { EmployeeRelationsAnalyticsService } from "../employee-relations/analytics/employee-relations-analytics.service"
import { EmployeesService } from "../employees/employees.service"
import { LearningAnalyticsService } from "../learning/analytics/analytics.service"
import { LeaveAnalyticsService } from "../leave/leave-analytics/leave-analytics.service"
import { AssignmentsService as OnboardingAssignmentsService } from "../onboarding-documents/assignments/assignments.service"
import { PerformanceAnalyticsService } from "../performance/analytics/analytics.service"
import { PrismaService } from "../../prisma/prisma.service"
import { RecruitmentAnalyticsService } from "../recruitment/analytics/analytics.service"

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Thin aggregation layer over eight already-independently-working modules
 * — every number here is computed by an existing service method (or a
 * small direct Prisma query for the couple of things no summary method
 * exists for yet: employee headcount buckets, org-wide carry-forward
 * totals). Nothing is duplicated/reimplemented; this class just composes
 * and reshapes. See ExecutiveDashboardModule's doc comment for why this
 * lives in its own module rather than bolting onto any one of the eight.
 */
@Injectable()
export class ExecutiveDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recruitmentAnalyticsService: RecruitmentAnalyticsService,
    private readonly learningAnalyticsService: LearningAnalyticsService,
    private readonly performanceAnalyticsService: PerformanceAnalyticsService,
    private readonly leaveAnalyticsService: LeaveAnalyticsService,
    private readonly employeeRelationsAnalyticsService: EmployeeRelationsAnalyticsService,
    private readonly onboardingAssignmentsService: OnboardingAssignmentsService,
    // Injected but currently unused directly — EmployeesService has no
    // summary method yet, so employeeOverview() queries Prisma itself
    // below. Kept as a constructor param so future work (e.g. a proper
    // EmployeesService.getHeadcountOverview()) can be wired in without
    // touching the module's import graph.
    private readonly employeesService: EmployeesService
  ) {}

  private async employeeOverview() {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * DAY_MS)

    const contractExpiryWindowEnd = new Date(now.getTime() + 90 * DAY_MS)

    const [total, active, exiting, exited, newJoiners30, newJoiners90, contractsExpiring90] = await Promise.all([
      this.prisma.employee.count(),
      this.prisma.employee.count({ where: { employmentStatus: "ACTIVE" } }),
      this.prisma.employee.count({ where: { employmentStatus: "ACTIVE", exitInitiatedAt: { not: null } } }),
      this.prisma.employee.count({ where: { employmentStatus: "EXIT" } }),
      this.prisma.employee.count({ where: { employmentStartDate: { gte: thirtyDaysAgo } } }),
      this.prisma.employee.count({ where: { employmentStartDate: { gte: ninetyDaysAgo } } }),
      // Active employees whose contract ends within 90 days — replaces the
      // HR Analytics page loading every employee just to count this.
      this.prisma.employee.count({
        where: { employmentStatus: "ACTIVE", contractEndDate: { gte: now, lte: contractExpiryWindowEnd } },
      }),
    ])

    return { totalEmployees: total, activeEmployees: active, exitingEmployees: exiting, exitedEmployees: exited, newJoinersLast30Days: newJoiners30, newJoinersLast90Days: newJoiners90, contractsExpiringNext90Days: contractsExpiring90 }
  }

  private async recruitmentOverview(actingEmployeeId: string) {
    const [overview, timeToHire, funnel] = await Promise.all([
      this.recruitmentAnalyticsService.getOverview(actingEmployeeId),
      this.recruitmentAnalyticsService.getTimeToHire(actingEmployeeId),
      this.recruitmentAnalyticsService.getFunnel(actingEmployeeId),
    ])
    return { ...overview, timeToHire, pipeline: funnel }
  }

  /** "AML Compliance" isn't a modeled concept of its own — it's whichever
   *  Course(s) HR named with "AML" in the title, per the spec's example.
   *  Computed here via a direct query rather than a new
   *  LearningAnalyticsService filter, to avoid widening that service's
   *  filter surface for a single dashboard tile. */
  private async amlCompliance() {
    const assignments = await this.prisma.courseAssignment.findMany({
      where: { course: { name: { contains: "AML", mode: "insensitive" } } },
      select: { status: true },
    })
    const completedStatuses = new Set(["VERIFIED", "CLOSED"])
    const total = assignments.length
    const completed = assignments.filter((a) => completedStatuses.has(a.status)).length
    return { totalAssigned: total, completed, compliancePercent: total === 0 ? null : Math.round((completed / total) * 10000) / 100 }
  }

  private async learningOverview() {
    const [overview, progress, aml] = await Promise.all([
      this.learningAnalyticsService.overview(),
      this.learningAnalyticsService.progressBreakdown({ isMandatory: true }),
      this.amlCompliance(),
    ])
    return {
      mandatoryTrainingCompliance: overview.totalAssignments === 0 ? null : overview.completionRate,
      courseCompletionRate: overview.completionRate,
      overdueMandatoryTraining: progress.overdue,
      amlCompliance: aml,
    }
  }

  private async performanceOverview() {
    const [distribution, trends, topPerformers] = await Promise.all([
      this.performanceAnalyticsService.distribution({}),
      this.performanceAnalyticsService.trends({}),
      this.performanceAnalyticsService.topPerformers({}, 5),
    ])
    return { bellCurveDistribution: distribution, trends, topPerformers }
  }

  private async leaveOverview() {
    const year = new Date().getFullYear()
    const [utilizationByDepartment, currentlyOnLeave, carryForwardTotal] = await Promise.all([
      this.leaveAnalyticsService.utilizationByDepartment({ year }),
      this.leaveAnalyticsService.currentlyOnLeave({}),
      this.prisma.leaveBalance.aggregate({ where: { year }, _sum: { carriedForwardDays: true } }),
    ])
    const totalUtilizationDays = utilizationByDepartment.reduce((sum, d) => sum + d.days, 0)
    return {
      leaveUtilizationDays: totalUtilizationDays,
      utilizationByDepartment,
      employeesCurrentlyOnLeave: currentlyOnLeave.length,
      carryForwardBalanceTotal: carryForwardTotal._sum.carriedForwardDays ?? 0,
    }
  }

  private async employeeRelationsOverview(actingEmployeeId: string) {
    const [overview, sanctionTrend] = await Promise.all([
      this.employeeRelationsAnalyticsService.getOverview(actingEmployeeId),
      this.employeeRelationsAnalyticsService.getSanctionTrendByType(actingEmployeeId),
    ])
    return { activeDisciplinaryCases: overview.openCases, ...overview, sanctionTrends: sanctionTrend }
  }

  private async onboardingOverview(actingEmployeeId: string) {
    const rows = await this.onboardingAssignmentsService.getHrOverview(actingEmployeeId)
    const totalDocuments = rows.reduce((sum, r) => sum + r.total, 0)
    const approvedDocuments = rows.reduce((sum, r) => sum + r.approved, 0)
    const employeesWithOutstandingDocuments = rows.filter((r) => r.remaining > 0).length
    return {
      employeesWithOutstandingDocuments,
      onboardingCompletionRate: totalDocuments === 0 ? null : Math.round((approvedDocuments / totalDocuments) * 10000) / 100,
      employees: rows,
    }
  }

  /** "Expired Certifications" isn't trackable in this schema —
   *  EmployeeEducation has no certificate-expiry date, only the
   *  course/education's own start/end dates — so this tile is omitted
   *  rather than faked; noted explicitly in the response so the client can
   *  show "not tracked" instead of a misleading zero. */
  private async complianceOverview(actingEmployeeId: string) {
    const [progress, onboarding] = await Promise.all([
      this.learningAnalyticsService.progressBreakdown({ isMandatory: true }),
      this.onboardingOverview(actingEmployeeId),
    ])
    return {
      expiredCertifications: null as number | null,
      expiredCertificationsTracked: false,
      overdueMandatoryTraining: progress.overdue,
      outstandingEmployeeDocuments: onboarding.employees.reduce((sum, r) => sum + r.remaining, 0),
    }
  }

  async getOverview(actingEmployeeId: string) {
    const [employees, recruitment, learning, performance, leave, employeeRelations, onboarding, compliance] = await Promise.all([
      this.employeeOverview(),
      this.recruitmentOverview(actingEmployeeId),
      this.learningOverview(),
      this.performanceOverview(),
      this.leaveOverview(),
      this.employeeRelationsOverview(actingEmployeeId),
      this.onboardingOverview(actingEmployeeId),
      this.complianceOverview(actingEmployeeId),
    ])

    return { employees, recruitment, learning, performance, leave, employeeRelations, onboarding, compliance, generatedAt: new Date() }
  }

  /**
   * One row per department combining the metrics an operations head reviews:
   * headcount, open vacancies, average performance rating, mandatory-training
   * compliance, leave days used this year and exits in the last 12 months.
   * Composed from the existing analytics services plus two small queries.
   */
  async getDepartmentScorecards() {
    const year = new Date().getFullYear()
    const twelveMonthsAgo = new Date(Date.now() - 365 * DAY_MS)

    const [departments, activeStaff, exits, performance, training, leave, vacancies] = await Promise.all([
      this.prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      this.prisma.employee.findMany({ where: { employmentStatus: "ACTIVE" }, select: { position: { select: { departmentId: true } } } }),
      this.prisma.employee.findMany({ where: { exitDate: { gte: twelveMonthsAgo } }, select: { position: { select: { departmentId: true } } } }),
      this.performanceAnalyticsService.byDepartment({}),
      this.learningAnalyticsService.mandatoryComplianceByDepartment({}),
      this.leaveAnalyticsService.utilizationByDepartment({ year }),
      this.prisma.jobRequisition.groupBy({
        by: ["departmentId"],
        where: { status: "APPROVED" },
        _sum: { numberOfVacancies: true },
      }),
    ])

    const count = (rows: { position: { departmentId: string } | null }[]) => {
      const map = new Map<string, number>()
      for (const r of rows) {
        const id = r.position?.departmentId
        if (id) map.set(id, (map.get(id) ?? 0) + 1)
      }
      return map
    }
    const headcount = count(activeStaff)
    const exitCount = count(exits)
    const perfById = new Map(performance.map((p) => [p.departmentId, p]))
    const trainingById = new Map(training.map((t) => [t.id, t]))
    const trainingByName = new Map(training.map((t) => [t.name, t]))
    const leaveById = new Map(leave.map((l) => [l.departmentId, l]))
    const vacancyById = new Map(vacancies.map((v) => [v.departmentId, v._sum.numberOfVacancies ?? 0]))

    const rows = departments
      .map((d) => {
        const t = trainingById.get(d.id) ?? trainingByName.get(d.name)
        return {
          departmentId: d.id,
          departmentName: d.name,
          headcount: headcount.get(d.id) ?? 0,
          openVacancies: vacancyById.get(d.id) ?? 0,
          averageRating: perfById.get(d.id)?.averageRating ?? null,
          ratedReviews: perfById.get(d.id)?.reviews ?? 0,
          trainingCompliancePercent: t && t.totalMandatory > 0 ? t.compliancePercent : null,
          leaveDaysYtd: leaveById.get(d.id)?.days ?? 0,
          exitsLast12Months: exitCount.get(d.id) ?? 0,
        }
      })
      .filter((r) => r.headcount > 0 || r.openVacancies > 0 || r.exitsLast12Months > 0)
      .sort((a, b) => b.headcount - a.headcount)

    return { year, rows, generatedAt: new Date() }
  }
}
