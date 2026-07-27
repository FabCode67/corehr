import { apiFetchSafe } from "./client"

// ---- Enums ------------------------------------------------------------------

export type DisciplinaryCaseCategory =
  | "MISCONDUCT"
  | "ATTENDANCE"
  | "INSUBORDINATION"
  | "HARASSMENT"
  | "DISCRIMINATION"
  | "FRAUD"
  | "POLICY_VIOLATION"
  | "SAFETY_VIOLATION"
  | "PERFORMANCE_ISSUE"
  | "CONFIDENTIALITY_BREACH"
  | "OTHER"

export type DisciplinaryCaseStatus = "DRAFT" | "UNDER_INVESTIGATION" | "PENDING_DECISION" | "SANCTION_ISSUED" | "CLOSED" | "APPEALED"
export type InvestigationStatus = "IN_PROGRESS" | "COMPLETED"
export type GrievanceCategory =
  | "WORKPLACE_CONFLICT"
  | "HARASSMENT"
  | "DISCRIMINATION"
  | "COMPENSATION"
  | "WORKING_CONDITIONS"
  | "MANAGEMENT_CONDUCT"
  | "POLICY_DISPUTE"
  | "OTHER"
export type GrievanceStatus = "SUBMITTED" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED"
export type AppealStatus = "SUBMITTED" | "UNDER_REVIEW" | "DECIDED"
export type AppealOutcome = "UPHELD" | "OVERTURNED" | "MODIFIED"

export const CASE_STATUS_LABELS: Record<DisciplinaryCaseStatus, string> = {
  DRAFT: "Draft",
  UNDER_INVESTIGATION: "Under Investigation",
  PENDING_DECISION: "Pending Decision",
  SANCTION_ISSUED: "Sanction Issued",
  CLOSED: "Closed",
  APPEALED: "Appealed",
}

export const CASE_STATUS_BADGE_VARIANT: Record<DisciplinaryCaseStatus, "outline" | "success" | "secondary" | "destructive" | "default"> = {
  DRAFT: "outline",
  UNDER_INVESTIGATION: "default",
  PENDING_DECISION: "default",
  SANCTION_ISSUED: "secondary",
  CLOSED: "success",
  APPEALED: "destructive",
}

export const GRIEVANCE_STATUS_LABELS: Record<GrievanceStatus, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
}

export function formatErEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ")
}

function toQuery(params: Record<string, unknown>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

interface EmployeeRef {
  employeeNumber: string
  firstName: string
  lastName: string
}

interface EmployeeSummary extends EmployeeRef {
  employmentStatus: string
  position: { id: string; title: string; department: { id: string; name: string }; unit: { id: string; name: string } | null } | null
  branch: { id: string; name: string } | null
}

// ---- Sanction types -----------------------------------------------------------

export interface SanctionType {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function fetchSanctionTypes(includeInactive = false) {
  return apiFetchSafe<SanctionType[]>(`/employee-relations/sanction-types${toQuery({ includeInactive })}`)
}

export function fetchSanctionType(id: string) {
  return apiFetchSafe<SanctionType>(`/employee-relations/sanction-types/${id}`)
}

// ---- Disciplinary cases ---------------------------------------------------------

export interface DisciplinaryMeeting {
  id: string
  disciplinaryCaseId: string
  scheduledAt: string
  location: string | null
  notes: string | null
  createdById: string
  createdAt: string
}

export interface Investigation {
  id: string
  disciplinaryCaseId: string
  investigatorId: string
  startDate: string
  endDate: string | null
  dueDate: string | null
  status: InvestigationStatus
  summary: string | null
  findings: string | null
  supportingDocumentUrls: string[]
  recommendation: string | null
  investigator: EmployeeRef
  createdAt: string
  updatedAt: string
}

export interface Sanction {
  id: string
  disciplinaryCaseId: string
  employeeId: string
  sanctionTypeId: string
  dateOfSanction: string
  reason: string
  effectiveDate: string
  issuedById: string
  approvalAuthorityId: string | null
  comments: string | null
  supportingDocumentUrls: string[]
  sanctionType: SanctionType
  issuedBy: EmployeeRef
  approvalAuthority: EmployeeRef | null
  createdAt: string
  updatedAt: string
}

export interface Appeal {
  id: string
  disciplinaryCaseId: string
  employeeId: string
  appealDate: string
  appealReason: string
  supportingDocumentUrls: string[]
  status: AppealStatus
  outcome: AppealOutcome | null
  decisionDate: string | null
  decisionComments: string | null
  decidedById: string | null
  decidedBy: EmployeeRef | null
  createdAt: string
  updatedAt: string
}

export interface DisciplinaryCase {
  id: string
  caseNumber: string
  employeeId: string
  reportedById: string
  dateReported: string
  incidentDate: string
  incidentLocation: string | null
  category: DisciplinaryCaseCategory
  subject: string
  description: string
  supportingDocumentUrls: string[]
  witnesses: string[]
  investigationRequired: boolean
  status: DisciplinaryCaseStatus
  isConfidential: boolean
  closedAt: string | null
  employee: EmployeeSummary
  reportedBy: EmployeeRef
  meetings: DisciplinaryMeeting[]
  investigations: Investigation[]
  sanctions: Sanction[]
  appeals: Appeal[]
  createdAt: string
  updatedAt: string
}

export interface DisciplinaryCaseFilters {
  employeeId?: string
  status?: DisciplinaryCaseStatus
  category?: DisciplinaryCaseCategory
}

export function fetchDisciplinaryCases(filters: DisciplinaryCaseFilters, actingEmployeeId: string) {
  return apiFetchSafe<DisciplinaryCase[]>(`/employee-relations/cases${toQuery({ ...filters, actingEmployeeId })}`)
}

export function fetchDisciplinaryCase(id: string, actingEmployeeId: string) {
  return apiFetchSafe<DisciplinaryCase>(`/employee-relations/cases/${id}${toQuery({ actingEmployeeId })}`)
}

export interface EmployeeRelationsHistory {
  cases: DisciplinaryCase[]
  grievances: Grievance[]
}

export function fetchEmployeeRelationsHistory(employeeId: string, actingEmployeeId: string) {
  return apiFetchSafe<EmployeeRelationsHistory>(`/employee-relations/cases/history/${employeeId}${toQuery({ actingEmployeeId })}`)
}

// ---- Sanctions (permanent per-employee history) ----------------------------------

export function fetchSanctionsForEmployee(employeeId: string, actingEmployeeId: string) {
  return apiFetchSafe<Sanction[]>(`/employee-relations/employees/${employeeId}/sanctions${toQuery({ actingEmployeeId })}`)
}

// ---- Grievances -------------------------------------------------------------------

export interface Grievance {
  id: string
  grievanceNumber: string
  employeeId: string
  dateSubmitted: string
  subject: string
  description: string
  category: GrievanceCategory
  supportingDocumentUrls: string[]
  status: GrievanceStatus
  assignedToId: string | null
  resolutionComments: string | null
  resolvedAt: string | null
  employee: EmployeeRef
  assignedTo: EmployeeRef | null
  createdAt: string
  updatedAt: string
}

export interface GrievanceFilters {
  employeeId?: string
  status?: GrievanceStatus
}

export function fetchGrievances(filters: GrievanceFilters, actingEmployeeId: string) {
  return apiFetchSafe<Grievance[]>(`/employee-relations/grievances${toQuery({ ...filters, actingEmployeeId })}`)
}

export function fetchGrievance(id: string, actingEmployeeId: string) {
  return apiFetchSafe<Grievance>(`/employee-relations/grievances/${id}${toQuery({ actingEmployeeId })}`)
}

// ---- Analytics ----------------------------------------------------------------------

export interface ErOverview {
  totalCases: number
  openCases: number
  closedCases: number
  underInvestigation: number
  appealsPending: number
}

export function fetchErOverview(actingEmployeeId: string) {
  return apiFetchSafe<ErOverview>(`/employee-relations/analytics/overview${toQuery({ actingEmployeeId })}`)
}

export function fetchCasesByStatus(actingEmployeeId: string) {
  return apiFetchSafe<{ status: DisciplinaryCaseStatus; count: number }[]>(`/employee-relations/analytics/cases-by-status${toQuery({ actingEmployeeId })}`)
}

export function fetchCasesByCategory(actingEmployeeId: string) {
  return apiFetchSafe<{ category: DisciplinaryCaseCategory; count: number }[]>(`/employee-relations/analytics/cases-by-category${toQuery({ actingEmployeeId })}`)
}

export interface OrgBucket {
  key: string
  name: string
  count: number
}

export function fetchCasesByDepartment(actingEmployeeId: string) {
  return apiFetchSafe<OrgBucket[]>(`/employee-relations/analytics/cases-by-department${toQuery({ actingEmployeeId })}`)
}

export function fetchCasesByBranch(actingEmployeeId: string) {
  return apiFetchSafe<OrgBucket[]>(`/employee-relations/analytics/cases-by-branch${toQuery({ actingEmployeeId })}`)
}

export function fetchMonthlyCaseTrend(actingEmployeeId: string) {
  return apiFetchSafe<{ month: string; count: number }[]>(`/employee-relations/analytics/monthly-case-trend${toQuery({ actingEmployeeId })}`)
}

export function fetchAnnualCaseTrend(actingEmployeeId: string) {
  return apiFetchSafe<{ key: string; name: string; count: number }[]>(`/employee-relations/analytics/annual-case-trend${toQuery({ actingEmployeeId })}`)
}

export function fetchSanctionsByType(actingEmployeeId: string) {
  return apiFetchSafe<{ sanctionTypeId: string; name: string; count: number }[]>(`/employee-relations/analytics/sanctions-by-type${toQuery({ actingEmployeeId })}`)
}

export function fetchSanctionsByYear(actingEmployeeId: string) {
  return apiFetchSafe<{ key: string; name: string; count: number }[]>(`/employee-relations/analytics/sanctions-by-year${toQuery({ actingEmployeeId })}`)
}

export function fetchSanctionTrendByType(actingEmployeeId: string) {
  return apiFetchSafe<{ year: string; sanctionTypeId: string; sanctionTypeName: string; count: number }[]>(
    `/employee-relations/analytics/sanction-trend-by-type${toQuery({ actingEmployeeId })}`
  )
}

export function fetchSanctionsByDepartment(actingEmployeeId: string) {
  return apiFetchSafe<OrgBucket[]>(`/employee-relations/analytics/sanctions-by-department${toQuery({ actingEmployeeId })}`)
}

export function fetchSanctionsByBranch(actingEmployeeId: string) {
  return apiFetchSafe<OrgBucket[]>(`/employee-relations/analytics/sanctions-by-branch${toQuery({ actingEmployeeId })}`)
}

export function fetchSanctionsByFunction(actingEmployeeId: string) {
  return apiFetchSafe<OrgBucket[]>(`/employee-relations/analytics/sanctions-by-function${toQuery({ actingEmployeeId })}`)
}

export function fetchSanctionsByLevel(actingEmployeeId: string) {
  return apiFetchSafe<OrgBucket[]>(`/employee-relations/analytics/sanctions-by-level${toQuery({ actingEmployeeId })}`)
}

export function fetchSanctionsByBand(actingEmployeeId: string) {
  return apiFetchSafe<OrgBucket[]>(`/employee-relations/analytics/sanctions-by-band${toQuery({ actingEmployeeId })}`)
}

export interface InvestigationStats {
  totalInvestigations: number
  completedCount: number
  averageCompletionDays: number | null
  overdueCount: number
}

export function fetchInvestigationStats(actingEmployeeId: string) {
  return apiFetchSafe<InvestigationStats>(`/employee-relations/analytics/investigation-stats${toQuery({ actingEmployeeId })}`)
}

export interface AppealStats {
  totalAppeals: number
  pending: number
  appealRate: number | null
}

export function fetchAppealStats(actingEmployeeId: string) {
  return apiFetchSafe<AppealStats>(`/employee-relations/analytics/appeal-stats${toQuery({ actingEmployeeId })}`)
}

// ---- PDF export -------------------------------------------------------------------

/** Points at this Next.js app's own proxy route (API_URL is server-only —
 *  see forms.ts's formInstancePdfUrl for the same reasoning). */
export function disciplinaryCasePdfUrl(id: string, actingEmployeeId: string) {
  return `/api/employee-relations/cases/${id}/pdf${toQuery({ actingEmployeeId })}`
}
