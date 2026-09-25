import { apiFetchSafe } from "./client"

export const MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const

export type MonthKey = (typeof MONTH_KEYS)[number]

export const MONTH_LABELS: Record<MonthKey, string> = {
  january: "Jan",
  february: "Feb",
  march: "Mar",
  april: "Apr",
  may: "May",
  june: "Jun",
  july: "Jul",
  august: "Aug",
  september: "Sep",
  october: "Oct",
  november: "Nov",
  december: "Dec",
}

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

/** Points at the Next.js proxy route (mirrors departmentEmployeesExportUrl's
 *  reasoning — API_URL is server-only, so a browser download link can't
 *  hit the API directly). */
export function annualLeavePlanTemplateUrl(departmentId: string, actingEmployeeId: string, year: number) {
  const params = new URLSearchParams({ actingEmployeeId, year: String(year) })
  return `/api/department-dashboard/${departmentId}/leave-plan/template?${params.toString()}`
}

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

/** Points at the Next.js proxy route app/api/leave/annual-plan/export/route.ts. */
export function annualLeavePlanExportUrl(actingEmployeeId: string, year: number, departmentId?: string) {
  const params = new URLSearchParams({ actingEmployeeId, year: String(year) })
  if (departmentId) params.set("departmentId", departmentId)
  return `/api/leave/annual-plan/export?${params.toString()}`
}
