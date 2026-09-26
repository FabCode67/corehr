import { apiFetchSafe } from "./client"
// MONTH_KEYS, MonthKey, and MONTH_LABELS have moved to
// ./annual-leave-plan-utils — pure exports, kept free of this file's
// next/headers-dependent apiFetchSafe import so Client Components can use
// them (see that file's doc comment).
import type { MonthKey } from "./annual-leave-plan-utils"

export type AnnualLeavePlanEntry = {
  id: string
  employeeId: string
  year: number
  departmentId: string
  carryForwardBalance: number
  annualEntitlement: number
  totalEntitled: number
  leaveTaken: number
  leaveBalance: number
  uploadedById: string
  uploadedAt: string
  employee: { employeeNumber: string; firstName: string; middleName: string | null; lastName: string }
  department: { id: string; name: string }
} & Record<MonthKey, number>

export interface AnnualLeavePlanUploadSummary {
  totalRows: number
  created: number
  updated: number
  errors: string[]
}

export interface AnnualLeavePlanAnalytics {
  totalEmployeesPlanned: number
  totalPlannedDays: number
  averageLeaveBalance: number
  byDepartment: { departmentName: string; plannedDays: number }[]
  byMonth: { month: string; plannedDays: number }[]
}

// ---------------------------------------------------------------------
// Head of Department — scoped to their own department (+ sub-departments),
// same access gate as every other department-dashboard capability.
// ---------------------------------------------------------------------

export function fetchDepartmentAnnualLeavePlan(departmentId: string, actingEmployeeId: string, year: number) {
  const params = new URLSearchParams({ actingEmployeeId, year: String(year) })
  return apiFetchSafe<AnnualLeavePlanEntry[]>(`/department-dashboard/${departmentId}/leave-plan?${params.toString()}`)
}

// ---------------------------------------------------------------------
// HR — bank-wide, every department at once (or filtered to one).
// ---------------------------------------------------------------------

export function fetchAllAnnualLeavePlans(actingEmployeeId: string, year: number, departmentId?: string) {
  const params = new URLSearchParams({ actingEmployeeId, year: String(year) })
  if (departmentId) params.set("departmentId", departmentId)
  return apiFetchSafe<AnnualLeavePlanEntry[]>(`/leave/annual-plan?${params.toString()}`)
}

export function fetchAnnualLeavePlanAnalytics(actingEmployeeId: string, year: number, departmentId?: string) {
  const params = new URLSearchParams({ actingEmployeeId, year: String(year) })
  if (departmentId) params.set("departmentId", departmentId)
  return apiFetchSafe<AnnualLeavePlanAnalytics>(`/leave/annual-plan/analytics?${params.toString()}`)
}

