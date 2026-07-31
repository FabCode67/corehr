import { apiFetchSafe } from "./client"

// Mirrors ExecutiveDashboardService.getOverview()'s return shape on the
// server (server/src/modules/executive-dashboard/executive-dashboard.service.ts).
// This is a pure read-only aggregation endpoint, so there's no separate
// -actions.ts file for this feature.

export interface EmployeeOverview {
  totalEmployees: number
  activeEmployees: number
  exitingEmployees: number
  exitedEmployees: number
  newJoinersLast30Days: number
  newJoinersLast90Days: number
}

export interface RecruitmentOverview {
  openRequisitions: number
  activeApplications: number
  interviewsThisWeek: number
  pendingOffers: number
  hiresThisMonth: number
  timeToHire: unknown
  pipeline: { status: string; count: number }[]
}

export interface AmlCompliance {
  totalAssigned: number
  completed: number
  compliancePercent: number | null
}

export interface LearningOverview {
  mandatoryTrainingCompliance: number | null
  courseCompletionRate: number
  overdueMandatoryTraining: number
  amlCompliance: AmlCompliance
}

export interface DistributionEntry {
  rank: number
  label: string
  count: number
  actualPercentage: number
  expectedPercentage: number | null
}

export interface YearTrend {
  year: number
  midYearAverage: number
  annualAverage: number
  overallAverage: number
}

export interface TopPerformerEntry {
  reviewId: string
  employeeId: string
  employeeName: string
  employeeNumber: string
  departmentName: string
  branchName: string
  rating: number
  reviewType: string
  periodName: string
}

export interface PerformanceOverview {
  bellCurveDistribution: DistributionEntry[]
  trends: YearTrend[]
  topPerformers: TopPerformerEntry[]
}

export interface LeaveDepartmentUtilization {
  departmentId: string
  departmentName: string
  days: number
  requests: number
}

export interface LeaveOverview {
  leaveUtilizationDays: number
  utilizationByDepartment: LeaveDepartmentUtilization[]
  employeesCurrentlyOnLeave: number
  carryForwardBalanceTotal: number
}

export interface EmployeeRelationsOverview {
  activeDisciplinaryCases: number
  totalCases: number
  openCases: number
  closedCases: number
  underInvestigation: number
  appealsPending: number
  sanctionTrends: { year: string; sanctionTypeId: string; sanctionTypeName: string; count: number }[]
}

export interface OnboardingEmployeeRow {
  employeeId: string
  employeeName: string
  departmentName: string
  total: number
  approved: number
  remaining: number
  percentageCompleted: number
}

export interface OnboardingOverview {
  employeesWithOutstandingDocuments: number
  onboardingCompletionRate: number | null
  employees: OnboardingEmployeeRow[]
}

export interface ComplianceOverview {
  expiredCertifications: number | null
  expiredCertificationsTracked: boolean
  overdueMandatoryTraining: number
  outstandingEmployeeDocuments: number
}

export interface ExecutiveDashboardOverview {
  employees: EmployeeOverview
  recruitment: RecruitmentOverview
  learning: LearningOverview
  performance: PerformanceOverview
  leave: LeaveOverview
  employeeRelations: EmployeeRelationsOverview
  onboarding: OnboardingOverview
  compliance: ComplianceOverview
  generatedAt: string
}

export function fetchExecutiveDashboardOverview(actingEmployeeId: string) {
  return apiFetchSafe<ExecutiveDashboardOverview>(
    `/executive-dashboard/overview?actingEmployeeId=${encodeURIComponent(actingEmployeeId)}`
  )
}

/** Points at this Next.js app's own proxy route (API_URL is server-only —
 *  see lib/api/forms.ts's formInstancePdfUrl for the same reasoning). */
export function executiveDashboardPdfUrl(actingEmployeeId: string) {
  return `/api/executive-dashboard/pdf?actingEmployeeId=${encodeURIComponent(actingEmployeeId)}`
}
