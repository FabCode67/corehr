import type { OrgChartNode } from "@/lib/org-chart"

import { apiFetchSafe } from "./client"
import type { Employee, EmployeeFamilyTree } from "./employees"
import type { FormInstance } from "./forms"
import type { LeaveBalance, LeaveCalendarData, LeaveRequest, LeaveRequestStatus } from "./leave"
import type { PaginatedResult } from "./pagination"
import type { FullProfile } from "./professional-profile"

export interface HeadedDepartment {
  id: string
  name: string
  code: string | null
}

export function fetchMyHeadedDepartments(actingEmployeeId: string) {
  return apiFetchSafe<HeadedDepartment[]>(`/department-dashboard/my-departments?actingEmployeeId=${actingEmployeeId}`)
}

export interface DepartmentDashboardSummary {
  department: {
    id: string
    name: string
    code: string | null
    functionName: string
    headOfDepartment: { employeeNumber: string; firstName: string; middleName: string | null; lastName: string } | null
    actingHeadOfDepartment: { employeeNumber: string; firstName: string; middleName: string | null; lastName: string } | null
  }
  headcount: {
    total: number
    byGender: { gender: string; count: number }[]
    byContractType: { contractType: string; count: number }[]
    vacantPositions: number
  }
  performance: {
    total: number
    completionRate: number
    averageRating: number | null
    byStatus: { status: string; count: number }[]
    ratingDistribution: { rating: number; count: number }[]
  }
  leave: {
    pendingApprovalCount: number
    totalDaysTakenThisYear: number
    currentlyOnLeaveCount: number
    byType: { leaveTypeName: string; count: number }[]
  }
  forms: {
    pendingCount: number
    overdueCount: number
    completedThisMonth: number
    byStatus: { status: string; count: number }[]
  }
}

export function fetchDepartmentDashboardSummary(departmentId: string, actingEmployeeId: string) {
  return apiFetchSafe<DepartmentDashboardSummary>(
    `/department-dashboard/${departmentId}/summary?actingEmployeeId=${actingEmployeeId}`
  )
}

// ---------------------------------------------------------------------------
// Head of Department portal — view/export/recruit capabilities layered onto
// the dashboard above. See department-dashboard.service.ts's module doc
// comment on the "no write access to employee/position records" boundary.
// ---------------------------------------------------------------------------

/** Paginated, department-scoped employee list — same Employee shape as the
 *  admin Employees table (lib/api/employees.ts), just pre-scoped server-side. */
export function fetchDepartmentEmployees(
  departmentId: string,
  actingEmployeeId: string,
  params: { search?: string; positionId?: string; page?: number; pageSize?: number } = {}
) {
  const query = new URLSearchParams({ actingEmployeeId })
  if (params.search) query.set("search", params.search)
  if (params.positionId) query.set("positionId", params.positionId)
  query.set("page", String(params.page ?? 1))
  if (params.pageSize) query.set("pageSize", String(params.pageSize))
  return apiFetchSafe<PaginatedResult<Employee>>(`/department-dashboard/${departmentId}/employees?${query.toString()}`)
}

export function fetchDepartmentEmployee(departmentId: string, employeeId: string, actingEmployeeId: string) {
  return apiFetchSafe<Employee>(
    `/department-dashboard/${departmentId}/employees/${employeeId}?actingEmployeeId=${actingEmployeeId}`
  )
}

export interface DepartmentPosition {
  id: string
  title: string
  department: { id: string; name: string }
  unit: { id: string; name: string } | null
  level: { id: string; name: string; code: string | null; rank: number }
  employees: { employeeNumber: string; firstName: string; middleName: string | null; lastName: string }[]
  isVacant: boolean
}

export function fetchDepartmentPositions(departmentId: string, actingEmployeeId: string) {
  return apiFetchSafe<DepartmentPosition[]>(`/department-dashboard/${departmentId}/positions?actingEmployeeId=${actingEmployeeId}`)
}

export interface DepartmentLearningRow {
  employeeNumber: string
  firstName: string
  middleName: string | null
  lastName: string
  completedHours: number
  completedCount: number
  inProgressCount: number
  assignedCount: number
}

export function fetchDepartmentLearningHours(departmentId: string, actingEmployeeId: string) {
  return apiFetchSafe<DepartmentLearningRow[]>(`/department-dashboard/${departmentId}/learning-hours?actingEmployeeId=${actingEmployeeId}`)
}

/** Reuses the same OrgChartNode shape as the bank-wide chart (lib/org-chart.ts)
 *  — this is just a pruned subtree, not a different data model. */
export function fetchDepartmentOrgChart(departmentId: string, actingEmployeeId: string) {
  return apiFetchSafe<OrgChartNode[]>(`/department-dashboard/${departmentId}/org-chart?actingEmployeeId=${actingEmployeeId}`)
}

export interface EligibleWorkforcePlan {
  id: string
  title: string
  departmentId: string
  numberOfPositions: number
  employmentType: string
  expectedHiringDate: string | null
  department: { name: string }
}

/** Only APPROVED workforce plans scoped to the department — the set a
 *  department head can build a job requisition against. See
 *  DepartmentDashboardService.getEligibleWorkforcePlans's doc comment for
 *  why this can't reuse the admin Workforce Plans fetcher. */
export function fetchEligibleWorkforcePlans(departmentId: string, actingEmployeeId: string) {
  return apiFetchSafe<EligibleWorkforcePlan[]>(`/department-dashboard/${departmentId}/workforce-plans?actingEmployeeId=${actingEmployeeId}`)
}

// ---------------------------------------------------------------------
// Leave management — department-wide write access (approve/reject/cancel
// go through the existing generic /leave/requests/:id/decide and /:id/cancel
// endpoints directly, reusing DecideRequestForm/CancelRequestButton
// unmodified — see LeaveRequestsService.assertCanDecideStep/assertCanCancel
// for the department-head-aware authorization). Only the read views and the
// balance-adjustment write are department-dashboard-specific routes.
// ---------------------------------------------------------------------

export function fetchDepartmentLeaveCalendar(departmentId: string, actingEmployeeId: string, year: number, month: number) {
  const query = new URLSearchParams({ actingEmployeeId, year: String(year), month: String(month) })
  return apiFetchSafe<LeaveCalendarData>(`/department-dashboard/${departmentId}/leave/calendar?${query.toString()}`)
}

export function fetchDepartmentLeaveRequests(
  departmentId: string,
  actingEmployeeId: string,
  params: { status?: LeaveRequestStatus } = {}
) {
  const query = new URLSearchParams({ actingEmployeeId })
  if (params.status) query.set("status", params.status)
  return apiFetchSafe<LeaveRequest[]>(`/department-dashboard/${departmentId}/leave/requests?${query.toString()}`)
}

export interface DepartmentLeaveBalanceRow {
  employee: { employeeNumber: string; firstName: string; middleName: string | null; lastName: string }
  balances: LeaveBalance[]
}

export function fetchDepartmentLeaveBalances(departmentId: string, actingEmployeeId: string, year?: number) {
  const query = new URLSearchParams({ actingEmployeeId })
  if (year) query.set("year", String(year))
  return apiFetchSafe<DepartmentLeaveBalanceRow[]>(`/department-dashboard/${departmentId}/leave/balances?${query.toString()}`)
}

// ---------------------------------------------------------------------
// Performance — read-only, per-employee latest-review view.
// ---------------------------------------------------------------------

export interface DepartmentPerformanceRow {
  employee: { employeeNumber: string; firstName: string; middleName: string | null; lastName: string }
  reviewType: string
  status: string
  overallRating: number | null
  period: { name: string; year: number }
  submittedAt: string | null
  finalizedAt: string | null
}

export function fetchDepartmentPerformance(departmentId: string, actingEmployeeId: string) {
  return apiFetchSafe<DepartmentPerformanceRow[]>(`/department-dashboard/${departmentId}/performance?actingEmployeeId=${actingEmployeeId}`)
}

// ---------------------------------------------------------------------
// Employee full profile — "see a profile of his each and every employee,
// including birthdate, joining date, leaves, employee relation status,
// performance, learning hours, relatives, forms and everything related to
// his or her employee". fetchDepartmentEmployee() above already returns
// birthdate/joining date/marital status/exit info/children/education; the
// fetchers below cover everything else that request named, each scoped to
// department head + department/employee id like every other fetcher here.
// ---------------------------------------------------------------------

export function fetchDepartmentEmployeeFamily(departmentId: string, employeeId: string, actingEmployeeId: string) {
  return apiFetchSafe<EmployeeFamilyTree>(
    `/department-dashboard/${departmentId}/employees/${employeeId}/family?actingEmployeeId=${actingEmployeeId}`
  )
}

export interface DepartmentEmployeeRelationsCase {
  id: string
  caseNumber: string
  category: string
  subject: string
  status: string
  dateReported: string
  incidentDate: string
  closedAt: string | null
}

export interface DepartmentEmployeeRelations {
  cases: DepartmentEmployeeRelationsCase[]
}

/** Deliberately narrower than the HR/admin Employee Relations view — only
 *  non-confidential disciplinary cases, no grievances (see the server
 *  method's doc comment). */
export function fetchDepartmentEmployeeRelations(departmentId: string, employeeId: string, actingEmployeeId: string) {
  return apiFetchSafe<DepartmentEmployeeRelations>(
    `/department-dashboard/${departmentId}/employees/${employeeId}/relations?actingEmployeeId=${actingEmployeeId}`
  )
}

export function fetchDepartmentEmployeeProfessionalProfile(departmentId: string, employeeId: string, actingEmployeeId: string) {
  return apiFetchSafe<FullProfile>(
    `/department-dashboard/${departmentId}/employees/${employeeId}/professional-profile?actingEmployeeId=${actingEmployeeId}`
  )
}

export function fetchDepartmentEmployeeForms(departmentId: string, employeeId: string, actingEmployeeId: string) {
  return apiFetchSafe<FormInstance[]>(
    `/department-dashboard/${departmentId}/employees/${employeeId}/forms?actingEmployeeId=${actingEmployeeId}`
  )
}

export interface DepartmentEmployeePerformanceRecord {
  id: string
  reviewType: string
  status: string
  overallRating: number | null
  period: { name: string; year: number }
  reviewer: { employeeNumber: string; firstName: string; lastName: string } | null
  submittedAt: string | null
  acknowledgedAt: string | null
  finalizedAt: string | null
}

/** Full review history for one employee — fetchDepartmentPerformance()
 *  above only returns the latest review per employee across the whole
 *  department. */
export function fetchDepartmentEmployeePerformanceHistory(departmentId: string, employeeId: string, actingEmployeeId: string) {
  return apiFetchSafe<DepartmentEmployeePerformanceRecord[]>(
    `/department-dashboard/${departmentId}/employees/${employeeId}/performance-history?actingEmployeeId=${actingEmployeeId}`
  )
}

export interface DepartmentEmployeeLeaveDetail {
  balances: LeaveBalance[]
  requests: LeaveRequest[]
}

export function fetchDepartmentEmployeeLeaveDetail(
  departmentId: string,
  employeeId: string,
  actingEmployeeId: string,
  year?: number
) {
  const query = new URLSearchParams({ actingEmployeeId })
  if (year) query.set("year", String(year))
  return apiFetchSafe<DepartmentEmployeeLeaveDetail>(
    `/department-dashboard/${departmentId}/employees/${employeeId}/leave-detail?${query.toString()}`
  )
}
