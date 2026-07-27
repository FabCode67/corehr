import type { Branch } from "./branches"
import { apiFetchSafe } from "./client"
import type { ContractType, Gender } from "./employees"
import type { PaginatedResult } from "./pagination"

// ---- Enums --------------------------------------------------------------

export type PerformanceReviewType = "MID_YEAR" | "ANNUAL"
export type PerformanceCycleStatus = "DRAFT" | "OPEN" | "CLOSED"
export type PerformanceReviewStatus = "DRAFT" | "SUBMITTED" | "ACKNOWLEDGED" | "FINALIZED"

export const REVIEW_TYPE_LABELS: Record<PerformanceReviewType, string> = {
  MID_YEAR: "Mid-Year Review",
  ANNUAL: "Annual Review",
}

export const REVIEW_STATUS_LABELS: Record<PerformanceReviewStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  ACKNOWLEDGED: "Acknowledged",
  FINALIZED: "Finalized",
}

// ---- Rating scale ---------------------------------------------------------

export interface RatingScaleEntry {
  id: string
  rank: number
  label: string
  description: string | null
  isActive: boolean
}

export function fetchRatingScale(includeInactive = false) {
  const search = includeInactive ? "?includeInactive=true" : ""
  return apiFetchSafe<RatingScaleEntry[]>(`/performance/rating-scale${search}`)
}

// ---- Review periods -------------------------------------------------------

export interface ReviewPeriod {
  id: string
  name: string
  year: number
  midYearStatus: PerformanceCycleStatus
  midYearOpensAt: string | null
  midYearClosesAt: string | null
  annualStatus: PerformanceCycleStatus
  annualOpensAt: string | null
  annualClosesAt: string | null
}

export function fetchReviewPeriods() {
  return apiFetchSafe<ReviewPeriod[]>("/performance/review-periods")
}

export function fetchReviewPeriod(id: string) {
  return apiFetchSafe<ReviewPeriod>(`/performance/review-periods/${id}`)
}

// ---- Reviews ---------------------------------------------------------------

interface ReviewEmployeeSummary {
  employeeNumber: string
  firstName: string
  lastName: string
  profilePictureUrl: string | null
}

interface ReviewPersonSummary {
  employeeNumber: string
  firstName: string
  lastName: string
}

export interface AuditLogEntry {
  id: string
  action: string
  actorId: string | null
  actor: { firstName: string; lastName: string } | null
  notes: string | null
  createdAt: string
}

export interface PerformanceReview {
  id: string
  reviewType: PerformanceReviewType
  status: PerformanceReviewStatus

  period: ReviewPeriod
  employee: ReviewEmployeeSummary
  reviewer: ReviewPersonSummary | null
  department: { id: string; name: string } | null
  unit: { id: string; name: string } | null
  position: { id: string; title: string } | null
  level: { id: string; name: string } | null
  band: { id: string; name: string } | null
  branch: Branch | null
  contractType: ContractType | null
  gender: Gender | null

  overallRating: number | null
  strengths: string | null
  achievements: string | null
  areasForImprovement: string | null
  goalsAchieved: string | null
  goalsNotAchieved: string | null
  behaviourCompetencies: string | null
  recommendedTraining: string | null
  developmentPlan: string | null

  managerComments: string | null
  employeeComments: string | null
  hrComments: string | null

  submittedAt: string | null
  acknowledgedAt: string | null
  finalizedAt: string | null

  createdAt: string
  updatedAt: string

  auditLogs?: AuditLogEntry[]
}

export interface ReviewFilters {
  periodId?: string
  reviewType?: PerformanceReviewType
  status?: string
  employeeId?: string
  departmentId?: string
  unitId?: string
  branchId?: string
  positionId?: string
  levelId?: string
  bandId?: string
  contractType?: string
  gender?: string
}

function toQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

export function fetchReviews(filters: ReviewFilters, actingEmployeeId: string) {
  return apiFetchSafe<PerformanceReview[]>(`/performance/reviews${toQuery({ ...filters, actingEmployeeId })}`)
}

export function fetchReviewsPaginated(
  filters: ReviewFilters,
  actingEmployeeId: string,
  page: number,
  pageSize?: number
) {
  return apiFetchSafe<PaginatedResult<PerformanceReview>>(
    `/performance/reviews${toQuery({ ...filters, actingEmployeeId, page, pageSize })}`
  )
}

export function fetchReview(id: string, actingEmployeeId: string) {
  return apiFetchSafe<PerformanceReview>(`/performance/reviews/${id}${toQuery({ actingEmployeeId })}`)
}

export function fetchReviewHistory(employeeId: string, actingEmployeeId: string) {
  return apiFetchSafe<PerformanceReview[]>(
    `/performance/reviews/history/${employeeId}${toQuery({ actingEmployeeId })}`
  )
}

// ---- Analytics --------------------------------------------------------------

export interface AnalyticsFilters {
  periodId?: string
  year?: number
  reviewType?: PerformanceReviewType
  departmentId?: string
  unitId?: string
  branchId?: string
  positionId?: string
  levelId?: string
  bandId?: string
  contractType?: string
  gender?: string
  employeeId?: string
}

export interface DistributionEntry {
  rank: number
  label: string
  count: number
}

export interface GroupPerformance {
  averageRating: number
  reviews: number
}

export interface DepartmentPerformance extends GroupPerformance {
  departmentId: string
  departmentName: string
}

export interface UnitPerformance extends GroupPerformance {
  unitId: string
  unitName: string
}

export interface BranchPerformance extends GroupPerformance {
  branchId: string
  branchName: string
}

export interface LevelPerformance extends GroupPerformance {
  levelId: string
  levelName: string
}

export interface BandPerformance extends GroupPerformance {
  bandId: string
  bandName: string
}

export interface GenderPerformance extends GroupPerformance {
  gender: string
}

export interface ContractTypePerformance extends GroupPerformance {
  contractType: string
}

export interface YearTrend {
  year: number
  midYearAverage: number
  annualAverage: number
  overallAverage: number
}

export interface ProgressionPoint {
  year: number
  periodName: string
  reviewType: PerformanceReviewType
  rating: number
}

export interface TopPerformerEntry {
  reviewId: string
  employeeId: string
  employeeName: string
  employeeNumber: string
  departmentName: string
  branchName: string
  rating: number
  reviewType: PerformanceReviewType
  periodName: string
}

export interface NeedsImprovementEntry extends TopPerformerEntry {
  reviewerName: string
}

function analyticsQuery(filters: AnalyticsFilters, extra: Record<string, string | number | undefined> = {}) {
  return toQuery({ ...filters, ...extra })
}

export function fetchDistribution(filters: AnalyticsFilters = {}) {
  return apiFetchSafe<DistributionEntry[]>(`/performance/analytics/distribution${analyticsQuery(filters)}`)
}

export function fetchByDepartment(filters: AnalyticsFilters = {}) {
  return apiFetchSafe<DepartmentPerformance[]>(`/performance/analytics/by-department${analyticsQuery(filters)}`)
}

export function fetchByUnit(filters: AnalyticsFilters = {}) {
  return apiFetchSafe<UnitPerformance[]>(`/performance/analytics/by-unit${analyticsQuery(filters)}`)
}

export function fetchByBranch(filters: AnalyticsFilters = {}) {
  return apiFetchSafe<BranchPerformance[]>(`/performance/analytics/by-branch${analyticsQuery(filters)}`)
}

export function fetchByPositionLevel(filters: AnalyticsFilters = {}) {
  return apiFetchSafe<LevelPerformance[]>(`/performance/analytics/by-position-level${analyticsQuery(filters)}`)
}

export function fetchByBand(filters: AnalyticsFilters = {}) {
  return apiFetchSafe<BandPerformance[]>(`/performance/analytics/by-band${analyticsQuery(filters)}`)
}

export function fetchByGender(filters: AnalyticsFilters = {}) {
  return apiFetchSafe<GenderPerformance[]>(`/performance/analytics/by-gender${analyticsQuery(filters)}`)
}

export function fetchByContractType(filters: AnalyticsFilters = {}) {
  return apiFetchSafe<ContractTypePerformance[]>(`/performance/analytics/by-contract-type${analyticsQuery(filters)}`)
}

export function fetchTrends(filters: AnalyticsFilters = {}) {
  return apiFetchSafe<YearTrend[]>(`/performance/analytics/trends${analyticsQuery(filters)}`)
}

export function fetchProgression(employeeId: string) {
  return apiFetchSafe<ProgressionPoint[]>(`/performance/analytics/progression/${employeeId}`)
}

export function fetchTopPerformers(filters: AnalyticsFilters = {}, limit?: number) {
  return apiFetchSafe<TopPerformerEntry[]>(
    `/performance/analytics/top-performers${analyticsQuery(filters, { limit })}`
  )
}

export function fetchNeedsImprovement(filters: AnalyticsFilters = {}) {
  return apiFetchSafe<NeedsImprovementEntry[]>(`/performance/analytics/needs-improvement${analyticsQuery(filters)}`)
}
