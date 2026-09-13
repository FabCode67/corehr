import type { OrgChartNode } from "@/lib/org-chart"

import { apiFetchSafe } from "./client"
import type { Employee } from "./employees"
import type { PaginatedResult } from "./pagination"

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

/** Points at the Next.js proxy route (app/api/department-dashboard/[departmentId]/employees/export/route.ts)
 *  — same employeeExportUrl() reasoning as lib/api/employees.ts (API_URL is
 *  server-only, so a browser download link can't hit the API directly). */
export function departmentEmployeesExportUrl(
  departmentId: string,
  actingEmployeeId: string,
  columnKeys: string[],
  format: "xlsx" | "csv"
) {
  const params = new URLSearchParams()
  params.set("actingEmployeeId", actingEmployeeId)
  params.set("columns", columnKeys.join(","))
  params.set("format", format)
  return `/api/department-dashboard/${departmentId}/employees/export?${params.toString()}`
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
