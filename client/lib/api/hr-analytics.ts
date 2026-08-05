import { apiFetchSafe } from "./client"

// Mirrors the return shapes of server/src/modules/hr-analytics/*.ts.

export interface HrAnalyticsFilters {
  dateFrom?: string
  dateTo?: string
  years?: string // comma-separated, e.g. "2024,2025,2026"
  year?: string
  month?: string
  quarter?: string
  departmentId?: string
  functionId?: string
  unitId?: string
  branchId?: string
  positionId?: string
  levelId?: string
  bandId?: string
  contractType?: string
  gender?: string
  employmentStatus?: string
}

export function buildQuery(filters: HrAnalyticsFilters, actingEmployeeId: string): string {
  const params = new URLSearchParams()
  params.set("actingEmployeeId", actingEmployeeId)
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  return params.toString()
}

export interface TotalStaff {
  activeCount: number
  newJoined: number
  exited: number
  changePercent: number | null
}

export interface AverageAge {
  overall: number | null
  byDepartment: { departmentId: string; departmentName: string; averageAge: number }[]
  trend: { year: number; averageAge: number | null }[]
}

export interface BandDistributionRow {
  bandId: string
  bandName: string
  rank: number
  count: number
  percent: number
}

export interface AttritionBreakdownRow {
  key: string
  label: string
  count: number
}

export interface AttritionRate {
  rate: number
  exits: number
  previousYearRate: number
  changePercent: number
  breakdown: {
    byDepartment: AttritionBreakdownRow[]
    byFunction: AttritionBreakdownRow[]
    byBranch: AttritionBreakdownRow[]
    byContractType: AttritionBreakdownRow[]
    byBand: AttritionBreakdownRow[]
  }
}

export interface PositionFillRateRow {
  fillRate: number
  filled: number
  total: number
  [idKey: string]: string | number
}

export interface PositionFillRate {
  fillRate: number
  filled: number
  total: number
  byDepartment: PositionFillRateRow[]
  byUnit: PositionFillRateRow[]
  byFunction: PositionFillRateRow[]
}

export interface LeaveUtilizationSummary {
  totalEntitlement: number
  totalTaken: number
  totalRemaining: number
  utilizationPercent: number
  currentlyOnLeaveCount: number
  byDepartment: { departmentId: string; name: string; entitlement: number; taken: number; utilizationPercent: number }[]
  byBranch: { branchId: string; name: string; entitlement: number; taken: number; utilizationPercent: number }[]
}

export interface EmployeeDistributionRow {
  departmentId: string
  departmentName: string
  count: number
  percent: number
}

export interface ExitSummary {
  totalExits: number
  byReason: AttritionBreakdownRow[]
  byType: AttritionBreakdownRow[]
  byDepartment: AttritionBreakdownRow[]
  byBranch: AttritionBreakdownRow[]
  byContractType: AttritionBreakdownRow[]
  trend: { year: number; exits: number }[]
}

export interface EmployeeDemographics {
  ageHistogram: { bucket: string; count: number }[]
  genderDistribution: AttritionBreakdownRow[]
  contractTypeDistribution: AttritionBreakdownRow[]
  totalActive: number
}

export interface OrgStructureAnalytics {
  byFunction: AttritionBreakdownRow[]
  byDepartment: EmployeeDistributionRow[]
  byUnit: AttritionBreakdownRow[]
  managersVsIndividualContributors: { managers: number; individualContributors: number }
  spanOfControl: { employeeId: string; name: string; positionTitle: string; directReports: number }[]
  averageSpanOfControl: number
}

export interface EmployeeExperienceAnalytics {
  averageTenureYears: number
  averageBankingExperienceYears: number
  longestServing: { employeeId: string; name: string; positionTitle: string | null; tenureYears: number }[]
  newest: { employeeId: string; name: string; positionTitle: string | null; tenureYears: number }[]
  approachingRetirement: { employeeId: string; name: string; age: number; yearsToRetirement: number }[]
}

export interface PerformanceDistributionRow {
  rank: number
  label: string
  count: number
  actualPercentage: number
  expectedPercentage: number | null
}

export interface PerformanceByDepartmentRow {
  departmentId: string
  departmentName: string
  averageRating: number
  /** Population standard deviation of ratings within the department — see
   *  PerformanceAnalyticsService.stdDev()'s doc comment. */
  ratingStdDev: number
  reviews: number
}

export interface HiringExitTrendRow {
  year: number
  hires: number
  exits: number
}

export interface LeaveSummary {
  byDepartment: { departmentId: string; departmentName: string; days: number; requests: number }[]
  byType: { leaveTypeId: string; leaveTypeName: string; days: number; requests: number }[]
  monthlyTrend: { month: number; days: number; requests: number }[]
  heatmap: { month: number; byType: { leaveType: string; days: number }[] }[]
}

export interface RecruitmentAnalytics {
  overview: { openRequisitions: number; activeApplications: number; interviewsThisWeek: number; pendingOffers: number; hiresThisMonth: number }
  funnel: { status: string; count: number }[]
  timeToHire: { averageDays: number | null; sampleSize: number }
  vacanciesByDepartment: { departmentId: string; departmentName: string; openRequisitions: number; vacancies: number }[]
  offerStats: { byStatus: Record<string, number>; acceptanceRate: number | null }
  recruitmentSuccessRate: number | null
}

export interface LearningAnalytics {
  trainingCompletionRate: number
  mandatoryTrainingCompliance: {
    byDepartment: { id: string; name: string; totalMandatory: number; completedMandatory: number; compliancePercent: number }[]
    byFunction: { id: string; name: string; totalMandatory: number; completedMandatory: number; compliancePercent: number }[]
    byBranch: { id: string; name: string; totalMandatory: number; completedMandatory: number; compliancePercent: number }[]
    byBand: { id: string; name: string; totalMandatory: number; completedMandatory: number; compliancePercent: number }[]
  }
  amlCompletionRate: number | null
  trainingCostAndHoursByDepartment: { departmentId: string; departmentName: string; completionRate: number; averageTrainingHours: number; averageTrainingCost: number; outstandingMandatoryCourses: number }[]
}

export interface HrAnalyticsOverview {
  totalStaff: TotalStaff
  averageAge: AverageAge
  bandDistribution: BandDistributionRow[]
  attritionRate: AttritionRate
  positionFillRate: PositionFillRate
  leaveUtilization: LeaveUtilizationSummary
  employeeDistribution: EmployeeDistributionRow[]
}

export interface SavedView {
  id: string
  employeeId: string
  name: string
  filters: Record<string, string>
  createdAt: string
  updatedAt: string
}

const base = (path: string, filters: HrAnalyticsFilters, actingEmployeeId: string) => `/hr-analytics/${path}?${buildQuery(filters, actingEmployeeId)}`

export function fetchOverview(filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return apiFetchSafe<HrAnalyticsOverview>(base("overview", filters, actingEmployeeId))
}
export function fetchTotalStaff(filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return apiFetchSafe<TotalStaff>(base("kpis/total-staff", filters, actingEmployeeId))
}
export function fetchAverageAge(filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return apiFetchSafe<AverageAge>(base("kpis/average-age", filters, actingEmployeeId))
}
export function fetchBandDistribution(filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return apiFetchSafe<BandDistributionRow[]>(base("kpis/band-distribution", filters, actingEmployeeId))
}
export function fetchAttritionRate(filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return apiFetchSafe<AttritionRate>(base("kpis/attrition-rate", filters, actingEmployeeId))
}
export function fetchPositionFillRate(filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return apiFetchSafe<PositionFillRate>(base("kpis/position-fill-rate", filters, actingEmployeeId))
}
export function fetchLeaveUtilization(filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return apiFetchSafe<LeaveUtilizationSummary>(base("kpis/leave-utilization", filters, actingEmployeeId))
}
export function fetchEmployeeDistribution(filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return apiFetchSafe<EmployeeDistributionRow[]>(base("charts/employee-distribution-by-department", filters, actingEmployeeId))
}
export function fetchExitSummary(filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return apiFetchSafe<ExitSummary>(base("charts/exit-summary", filters, actingEmployeeId))
}
export function fetchDemographics(filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return apiFetchSafe<EmployeeDemographics>(base("charts/demographics", filters, actingEmployeeId))
}
export function fetchOrgStructure(filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return apiFetchSafe<OrgStructureAnalytics>(base("charts/org-structure", filters, actingEmployeeId))
}
export function fetchEmployeeExperience(filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return apiFetchSafe<EmployeeExperienceAnalytics>(base("charts/employee-experience", filters, actingEmployeeId))
}
export function fetchPerformanceDistribution(filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return apiFetchSafe<PerformanceDistributionRow[]>(base("charts/performance-distribution", filters, actingEmployeeId))
}
export function fetchPerformanceByDepartment(filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return apiFetchSafe<PerformanceByDepartmentRow[]>(base("charts/performance-by-department", filters, actingEmployeeId))
}
export function fetchHiringExitTrend(filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return apiFetchSafe<HiringExitTrendRow[]>(base("charts/hiring-exit-trend", filters, actingEmployeeId))
}
export function fetchLeaveSummary(filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return apiFetchSafe<LeaveSummary>(base("charts/leave-summary", filters, actingEmployeeId))
}
export function fetchRecruitmentAnalytics(actingEmployeeId: string) {
  return apiFetchSafe<RecruitmentAnalytics>(`/hr-analytics/charts/recruitment?actingEmployeeId=${encodeURIComponent(actingEmployeeId)}`)
}
export function fetchLearningAnalytics(filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return apiFetchSafe<LearningAnalytics>(base("charts/learning", filters, actingEmployeeId))
}
export function fetchSavedViews(actingEmployeeId: string) {
  return apiFetchSafe<SavedView[]>(`/hr-analytics/saved-views?actingEmployeeId=${encodeURIComponent(actingEmployeeId)}`)
}

export function exportUrl(format: "xlsx" | "csv" | "pdf" | "pptx", filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return `/api/hr-analytics/export/${format}?${buildQuery(filters, actingEmployeeId)}`
}

// ==== Custom Report Builder =====================================================
// Mirrors server/src/modules/hr-analytics/hr-analytics-export.service.ts's
// REPORT_SECTIONS catalog + generateCustomReport().

export interface ReportSectionMeta {
  key: string
  label: string
  description: string
  supportsDateRange: boolean
  caveat?: string
}

export function fetchReportSections(actingEmployeeId: string) {
  return apiFetchSafe<ReportSectionMeta[]>(`/hr-analytics/export/custom/sections?actingEmployeeId=${encodeURIComponent(actingEmployeeId)}`)
}

export interface CustomReportSectionSelection {
  key: string
  dateFrom?: string
  dateTo?: string
}

/** Each selected section (with its own optional date range) travels as one
 *  JSON-encoded query param — see the controller route's doc comment for
 *  why, vs. e.g. repeated `sections[]=` entries. */
export function customReportUrl(
  sections: CustomReportSectionSelection[],
  format: "xlsx" | "pptx",
  filters: HrAnalyticsFilters,
  actingEmployeeId: string
) {
  const params = new URLSearchParams(buildQuery(filters, actingEmployeeId))
  params.set("format", format)
  params.set("sections", JSON.stringify(sections))
  return `/api/hr-analytics/export/custom?${params.toString()}`
}
