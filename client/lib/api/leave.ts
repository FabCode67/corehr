import type { Branch } from "./branches"
import { apiFetchSafe } from "./client"
import type { Gender } from "./employees"
import type { PaginatedResult } from "./pagination"

// ---- Enums ------------------------------------------------------------

export type LeaveCategory = "ANNUAL" | "MATERNITY" | "PATERNITY" | "SICK" | "COMPASSIONATE" | "OTHER"
export type LeaveEntitlementCategory =
  | "PERMANENT"
  | "TEMPORARY"
  | "GRADUATE_TRAINEE"
  | "INTERN"
  | "MANAGING_DIRECTOR"
export type ApprovalRole = "LINE_MANAGER" | "HR"
export type LeaveRequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED"
export type ApprovalDecision = "APPROVED" | "REJECTED"
export type NotificationType =
  | "LEAVE_SUBMITTED"
  | "LEAVE_APPROVED"
  | "LEAVE_REJECTED"
  | "LEAVE_CANCELLED"
  | "LEAVE_STARTING_SOON"
  | "RETURNING_TOMORROW"
  | "LOW_BALANCE"
  | "APPROVAL_NEEDED"

export const LEAVE_ENTITLEMENT_CATEGORIES: LeaveEntitlementCategory[] = [
  "PERMANENT",
  "TEMPORARY",
  "GRADUATE_TRAINEE",
  "INTERN",
  "MANAGING_DIRECTOR",
]

export const LEAVE_CATEGORIES: LeaveCategory[] = [
  "ANNUAL",
  "MATERNITY",
  "PATERNITY",
  "SICK",
  "COMPASSIONATE",
  "OTHER",
]

// ---- Leave Types / Policy config --------------------------------------

export interface LeaveEntitlementRule {
  id: string
  leaveTypeId: string
  employeeCategory: LeaveEntitlementCategory
  days: number
}

export interface LeaveApprovalStep {
  id: string
  leaveTypeId: string
  order: number
  role: ApprovalRole
}

export interface LeaveCarryForwardRule {
  id: string
  leaveTypeId: string
  enabled: boolean
  maxDays: number | null
  expiresAfterDays: number | null
}

/** Base LeaveType fields only — what you get embedded in a LeaveRequest or
 *  LeaveBalance (Prisma's `leaveType: true` include, no nested relations). */
export interface LeaveTypeBase {
  id: string
  name: string
  code: string | null
  category: LeaveCategory
  isActive: boolean
  affectsAnnualBalance: boolean
  genderRestriction: Gender | null
  maxDaysPerYear: number | null
  requiresDocumentation: boolean
  documentationThresholdDays: number | null
  requiresHrApproval: boolean
  createdAt: string
  updatedAt: string
}

/** Full LeaveType with its configuration relations — used by the HR admin
 *  Leave Types panel. */
export interface LeaveType extends LeaveTypeBase {
  entitlementRules: LeaveEntitlementRule[]
  approvalSteps: LeaveApprovalStep[]
  carryForwardRule: LeaveCarryForwardRule | null
}

export interface PublicHoliday {
  id: string
  name: string
  date: string
  isRecurringAnnually: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LeaveSettings {
  id: number
  weekendDays: number[]
  excludeWeekends: boolean
  excludePublicHolidays: boolean
  updatedAt: string
}

// ---- Balances -----------------------------------------------------------

export interface LeaveBalance {
  id: string
  employeeId: string
  leaveTypeId: string
  year: number
  entitledDays: number
  carriedForwardDays: number
  adjustmentDays: number
  takenDays: number
  pendingDays: number
  remainingDays: number
  leaveType: LeaveTypeBase
  createdAt: string
  updatedAt: string
}

// ---- Requests / Approvals -------------------------------------------------

export interface LeaveRequestEmployee {
  employeeNumber: string
  firstName: string
  lastName: string
  gender: Gender
  branch: Branch | null
  position: {
    id: string
    title: string
    departmentId: string
    department: { id: string; name: string }
  } | null
}

export interface LeaveApproval {
  id: string
  leaveRequestId: string
  stepId: string
  order: number
  role: ApprovalRole
  decision: ApprovalDecision | null
  approverEmployeeId: string | null
  comment: string | null
  decidedAt: string | null
  createdAt: string
  approver: { employeeNumber: string; firstName: string; lastName: string } | null
}

export interface LeaveRequest {
  id: string
  employeeId: string
  leaveTypeId: string
  startDate: string
  endDate: string
  returnDate: string
  numberOfDays: number
  reason: string | null
  attachmentUrl: string | null
  delegateEmployeeId: string | null
  status: LeaveRequestStatus
  currentStepOrder: number | null
  hrOverride: boolean
  createdAt: string
  updatedAt: string
  employee: LeaveRequestEmployee
  leaveType: LeaveTypeBase
  delegate: { employeeNumber: string; firstName: string; lastName: string } | null
  approvals: LeaveApproval[]
}

export interface PreviewLeaveDaysResult {
  numberOfDays: number
  returnDate: string
}

export interface LeaveCalendarData {
  requests: LeaveRequest[]
  holidays: PublicHoliday[]
}

// ---- Notifications --------------------------------------------------------

export interface LeaveNotification {
  id: string
  recipientEmployeeId: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  relatedLeaveRequestId: string | null
  createdAt: string
}

// ---- Analytics --------------------------------------------------------

export interface AnalyticsFilters {
  departmentId?: string
  functionId?: string
  branchId?: string
  employeeId?: string
  year?: number
}

export interface DepartmentUtilization {
  departmentId: string
  departmentName: string
  days: number
  requests: number
}

export interface BranchUtilization {
  branchId: string
  branchName: string
  days: number
  requests: number
}

export interface GenderUtilization {
  gender: string
  days: number
  requests: number
}

export interface MonthlyTrend {
  month: number
  days: number
  requests: number
}

export interface TypeDistributionEntry {
  leaveTypeId: string
  leaveTypeName: string
  days: number
  requests: number
}

export interface BalanceExtreme {
  employeeId: string
  employeeName: string
  leaveTypeName: string
  remainingDays: number
}

export interface BalanceExtremesResult {
  highest: BalanceExtreme[]
  lowest: BalanceExtreme[]
}

export interface UpcomingLeaveEntry {
  id: string
  startDate: string
  endDate: string
  numberOfDays: number
  employee: { employeeNumber: string; firstName: string; lastName: string }
  leaveType: { name: string }
}

export interface CurrentlyOnLeaveEntry {
  id: string
  startDate: string
  endDate: string
  numberOfDays: number
  employee: {
    employeeNumber: string
    firstName: string
    lastName: string
    position: { title: string; department: { name: string } } | null
  }
  leaveType: { name: string }
}

// Generic (rather than `Record<string, ...>`) so named interfaces like
// LeaveRequestFilters can be passed directly — TS requires an explicit
// index signature to satisfy a Record parameter type, which our filter
// interfaces deliberately don't declare (keeps their fields typo-checked).
function toQuery<T extends object>(params: T) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params) as [string, string | number | boolean | undefined][]) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

// ---- Leave Types / Policy fetchers -----------------------------------

export function fetchLeaveTypes(includeInactive = false) {
  return apiFetchSafe<LeaveType[]>(`/leave/types${toQuery({ includeInactive: includeInactive ? "true" : undefined })}`)
}

export function fetchLeaveType(id: string) {
  return apiFetchSafe<LeaveType>(`/leave/types/${id}`)
}

export function fetchPublicHolidays(includeInactive = false) {
  return apiFetchSafe<PublicHoliday[]>(
    `/leave/holidays${toQuery({ includeInactive: includeInactive ? "true" : undefined })}`
  )
}

/** Paginated version for the Leave Settings holidays table. */
export function fetchPublicHolidaysPaginated(includeInactive = false, page = 1, pageSize?: number) {
  return apiFetchSafe<PaginatedResult<PublicHoliday>>(
    `/leave/holidays${toQuery({ includeInactive: includeInactive ? "true" : undefined, page, pageSize })}`
  )
}

export function fetchLeaveSettings() {
  return apiFetchSafe<LeaveSettings>("/leave/settings")
}

// ---- Balances -----------------------------------------------------------

export function fetchLeaveBalances(employeeId: string, year?: number) {
  return apiFetchSafe<LeaveBalance[]>(`/leave/balances/employee/${employeeId}${toQuery({ year })}`)
}

// ---- Requests / Approvals -------------------------------------------------

export interface LeaveRequestFilters {
  employeeId?: string
  departmentId?: string
  branchId?: string
  status?: LeaveRequestStatus
  leaveTypeId?: string
  from?: string
  to?: string
}

export function fetchLeaveRequests(filters: LeaveRequestFilters = {}) {
  return apiFetchSafe<LeaveRequest[]>(`/leave/requests${toQuery(filters)}`)
}

/** Paginated version for the Approvals and My Requests tables. */
export function fetchLeaveRequestsPaginated(
  filters: LeaveRequestFilters = {},
  page = 1,
  pageSize?: number
) {
  return apiFetchSafe<PaginatedResult<LeaveRequest>>(
    `/leave/requests${toQuery({ ...filters, page, pageSize })}`
  )
}

export function fetchLeaveRequest(id: string) {
  return apiFetchSafe<LeaveRequest>(`/leave/requests/${id}`)
}

export function fetchPendingForManager(employeeId: string) {
  return apiFetchSafe<LeaveRequest[]>(`/leave/requests/pending-for-manager/${employeeId}`)
}

export function fetchLeaveCalendar(
  year: number,
  month: number,
  filters: { departmentId?: string; branchId?: string } = {}
) {
  return apiFetchSafe<LeaveCalendarData>(
    `/leave/requests/calendar${toQuery({ year, month, ...filters })}`
  )
}

// ---- Notifications --------------------------------------------------------

export function fetchNotifications(employeeId: string, unreadOnly = false) {
  return apiFetchSafe<LeaveNotification[]>(
    `/notifications/employee/${employeeId}${toQuery({ unreadOnly: unreadOnly ? "true" : undefined })}`
  )
}

// ---- Analytics --------------------------------------------------------

function analyticsQuery(filters: AnalyticsFilters, extra: Record<string, string | number | undefined> = {}) {
  return toQuery({ ...filters, ...extra })
}

export function fetchUtilizationByDepartment(filters: AnalyticsFilters = {}) {
  return apiFetchSafe<DepartmentUtilization[]>(`/leave/analytics/utilization-by-department${analyticsQuery(filters)}`)
}

export function fetchUtilizationByBranch(filters: AnalyticsFilters = {}) {
  return apiFetchSafe<BranchUtilization[]>(`/leave/analytics/utilization-by-branch${analyticsQuery(filters)}`)
}

export function fetchUtilizationByGender(filters: AnalyticsFilters = {}) {
  return apiFetchSafe<GenderUtilization[]>(`/leave/analytics/utilization-by-gender${analyticsQuery(filters)}`)
}

export function fetchMonthlyTrends(filters: AnalyticsFilters = {}) {
  return apiFetchSafe<MonthlyTrend[]>(`/leave/analytics/monthly-trends${analyticsQuery(filters)}`)
}

export function fetchTypeDistribution(filters: AnalyticsFilters = {}) {
  return apiFetchSafe<TypeDistributionEntry[]>(`/leave/analytics/type-distribution${analyticsQuery(filters)}`)
}

export function fetchBalanceExtremes(filters: AnalyticsFilters = {}, limit?: number) {
  return apiFetchSafe<BalanceExtremesResult>(
    `/leave/analytics/balance-extremes${analyticsQuery(filters, { limit })}`
  )
}

export function fetchUpcomingLeave(filters: AnalyticsFilters = {}, daysAhead?: number) {
  return apiFetchSafe<UpcomingLeaveEntry[]>(
    `/leave/analytics/upcoming-leave${analyticsQuery(filters, { daysAhead })}`
  )
}

export function fetchCurrentlyOnLeave(filters: AnalyticsFilters = {}) {
  return apiFetchSafe<CurrentlyOnLeaveEntry[]>(`/leave/analytics/currently-on-leave${analyticsQuery(filters)}`)
}

export function formatLeaveStatusLabel(status: LeaveRequestStatus) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ")
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]
