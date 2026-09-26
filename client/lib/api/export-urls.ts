/**
 * Every plain "build a download URL string" helper in one file, deliberately
 * kept free of any import from `./client` (or any other `lib/api/*.ts` file
 * that imports it) — those files pull in `next/headers` (via `cookies()` in
 * apiFetch/apiFetchSafe/apiFetchCached), which Next.js refuses to let a
 * Client Component's bundle touch at all, even indirectly and even if the
 * actual code path never runs client-side. Several of the export/download
 * buttons that use these URLs live in "use client" dialogs (column pickers,
 * report builders), so importing e.g. `employeeExportUrl` from
 * `lib/api/employees.ts` (which also exports `apiFetchSafe`-based fetchers)
 * broke the production build with exactly that error. Every one of these
 * just builds a path string for an `<a href>` — none of them fetch
 * anything themselves, so they're safe to import from any component.
 *
 * All of them point at this Next.js app's own `/api/**` proxy routes (see
 * the corresponding `app/api/**\/route.ts` files), not the NestJS API
 * directly — the API's base URL is a server-only env var, so a
 * browser-clickable download link has to go through this app's own route
 * instead of hitting it directly.
 */

import type { HrAnalyticsFilters } from "./hr-analytics"

function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

// ---- Annual Leave Plan --------------------------------------------------------

export function annualLeavePlanTemplateUrl(departmentId: string, actingEmployeeId: string, year: number) {
  return `/api/department-dashboard/${departmentId}/leave-plan/template${toQuery({ actingEmployeeId, year })}`
}

export function annualLeavePlanExportUrl(actingEmployeeId: string, year: number, departmentId?: string) {
  return `/api/leave/annual-plan/export${toQuery({ actingEmployeeId, year, departmentId })}`
}

// ---- Department Dashboard employees export -------------------------------------

export function departmentEmployeesExportUrl(departmentId: string, actingEmployeeId: string, columnKeys: string[], format: "xlsx" | "csv") {
  return `/api/department-dashboard/${departmentId}/employees/export${toQuery({ actingEmployeeId, columns: columnKeys.join(","), format })}`
}

// ---- Employee Relations ---------------------------------------------------------

export function disciplinaryCasePdfUrl(id: string, actingEmployeeId: string) {
  return `/api/employee-relations/cases/${id}/pdf${toQuery({ actingEmployeeId })}`
}

// ---- Executive Dashboard ----------------------------------------------------------

export function executiveDashboardPdfUrl(actingEmployeeId: string) {
  return `/api/executive-dashboard/pdf${toQuery({ actingEmployeeId })}`
}

// ---- Employees --------------------------------------------------------------------

export function employeeFamilyTreeExportUrl(id: string, actingEmployeeId: string) {
  return `/api/employees/${id}/family-tree/export${toQuery({ actingEmployeeId })}`
}

export function allEmployeesFamilyTreeExportUrl(actingEmployeeId: string, includeInactive = false) {
  return `/api/employees/family-tree/export${toQuery({ actingEmployeeId, includeInactive: includeInactive || undefined })}`
}

/** `includeInactive` always sends true: the admin table itself always shows
 *  exited employees (with a status badge, never hidden), so the export
 *  should match what's on screen rather than silently dropping them. */
export function employeeExportUrl(columnKeys: string[], format: "xlsx" | "csv") {
  return `/api/employees/export${toQuery({ columns: columnKeys.join(","), format, includeInactive: "true" })}`
}

// ---- Forms --------------------------------------------------------------------------

export function formInstancePdfUrl(id: string, actingEmployeeId: string) {
  return `/api/forms/instances/${id}/pdf${toQuery({ actingEmployeeId })}`
}

// ---- HR Analytics ---------------------------------------------------------------------

/** Mirrors hr-analytics.ts's buildQuery() (kept file-local there since that
 *  file needs it for its own apiFetchSafe calls too) — duplicated rather
 *  than imported so this file stays free of any `./client`-importing
 *  dependency. Keep the two in sync if the filter shape changes. */
function buildHrAnalyticsQuery(filters: HrAnalyticsFilters, actingEmployeeId: string): string {
  const params = new URLSearchParams()
  params.set("actingEmployeeId", actingEmployeeId)
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, String(value))
  }
  return params.toString()
}

export function hrAnalyticsExportUrl(format: "xlsx" | "csv" | "pdf" | "pptx", filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return `/api/hr-analytics/export/${format}?${buildHrAnalyticsQuery(filters, actingEmployeeId)}`
}

export function hrAnalyticsExportSnapshotUrl(filters: HrAnalyticsFilters, actingEmployeeId: string) {
  return `/api/hr-analytics/export/snapshot-pdf?${buildHrAnalyticsQuery(filters, actingEmployeeId)}`
}

export interface CustomReportSectionSelection {
  key: string
  dateFrom?: string
  dateTo?: string
}

/** Each selected section (with its own optional date range) travels as one
 *  JSON-encoded query param — see the controller route's doc comment for
 *  why, vs. e.g. repeated `sections[]=` entries. */
export function hrAnalyticsCustomReportUrl(
  sections: CustomReportSectionSelection[],
  format: "xlsx" | "pptx",
  filters: HrAnalyticsFilters,
  actingEmployeeId: string
) {
  const params = new URLSearchParams(buildHrAnalyticsQuery(filters, actingEmployeeId))
  params.set("format", format)
  params.set("sections", JSON.stringify(sections))
  return `/api/hr-analytics/export/custom?${params.toString()}`
}

// ---- Imports ------------------------------------------------------------------------

export function importTemplateUrl(moduleKey: string) {
  return `/api/imports/${moduleKey}/template`
}

export function importJobFileUrl(jobId: string) {
  return `/api/imports/jobs/${jobId}/file`
}

export function importErrorReportUrl(jobId: string) {
  return `/api/imports/jobs/${jobId}/error-report`
}

export function importSuccessReportUrl(jobId: string) {
  return `/api/imports/jobs/${jobId}/success-report`
}
