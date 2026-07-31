import { apiFetchSafe } from "./client"

// ---- Types (mirrors server/src/modules/imports/registry/types.ts) --------

export type ImportRowStatus = "new" | "updated" | "duplicate" | "invalid"
export type ImportMatchStrategy = "employeeNumberUpdate" | "codeUpdate" | "insertOnly"
export type ImportJobStatus = "DRAFT" | "IMPORTING" | "COMPLETED" | "PARTIALLY_COMPLETED" | "FAILED"

export interface ImportTemplateColumn {
  key: string
  header: string
  required: boolean
  example: string
  description?: string
}

export interface ImportModuleMeta {
  key: string
  label: string
  referenceKeyLabel: string
  matchStrategy: ImportMatchStrategy
  columns: ImportTemplateColumn[]
}

export interface ImportRowResult {
  row: number
  status: ImportRowStatus
  employeeNumber?: string
  data: Record<string, unknown>
  errors: string[]
}

export interface ImportPreviewCounts {
  new: number
  updated: number
  duplicate: number
  invalid: number
}

export interface ImportPreviewResult {
  jobId: string
  module: string
  label: string
  totalRows: number
  counts: ImportPreviewCounts
  rows: ImportRowResult[]
}

export interface ImportRowOutcome {
  row: number
  employeeNumber?: string
  action: "created" | "updated" | "skipped" | "failed"
  error?: string
}

export interface ImportJobSummary {
  id: string
  module: string
  status: ImportJobStatus
  fileName: string
  totalRows: number
  newRecords: number
  updatedRecords: number
  skippedRecords: number
  failedRecords: number
  durationMs: number | null
  createdAt: string
  completedAt: string | null
  importedBy: { employeeNumber: string; firstName: string; lastName: string }
}

export interface ImportJobDetail extends ImportJobSummary {
  label: string
  referenceKeyLabel: string
  startedAt: string | null
  parsedRows: ImportRowResult[]
  rowResults: ImportRowOutcome[] | null
}

export interface ImportHistoryPage {
  items: ImportJobSummary[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ---- Fetchers (Server Components) -----------------------------------------

export function fetchImportModules() {
  return apiFetchSafe<ImportModuleMeta[]>("/imports/modules")
}

export function fetchImportHistory(filters: { module?: string; page?: number } = {}) {
  const search = new URLSearchParams()
  if (filters.module) search.set("module", filters.module)
  if (filters.page) search.set("page", String(filters.page))
  const query = search.toString()
  return apiFetchSafe<ImportHistoryPage>(`/imports/jobs${query ? `?${query}` : ""}`)
}

export function fetchImportJob(id: string) {
  return apiFetchSafe<ImportJobDetail>(`/imports/jobs/${id}`)
}

// ---- Download URLs (proxied through this Next.js app — see the /api/imports/... routes) --

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
