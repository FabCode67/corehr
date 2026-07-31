import type { Branch } from "./branches"
import { apiFetchSafe } from "./client"
import type { PaginatedResult } from "./pagination"

export type Gender = "MALE" | "FEMALE"
export type MaritalStatus = "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED"
export type ContractType = "PERMANENT" | "TEMPORARY" | "GRADUATE_TRAINEE" | "INTERN"
export type EmploymentStatus = "ACTIVE" | "EXIT"
export type ExitReason = "RESIGNATION" | "TERMINATION" | "END_OF_CONTRACT"
export type ExitType = "REGRETTABLE" | "NON_REGRETTABLE"
export type EducationType =
  | "DEGREE"
  | "DIPLOMA"
  | "CERTIFICATE"
  | "PROFESSIONAL_CERTIFICATION"
  | "TRAINING"
  | "COURSE"
  | "WORKSHOP"

export function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ")
}

export interface EmployeePosition {
  id: string
  title: string
  department: { id: string; name: string }
  unit: { id: string; name: string } | null
  level: { id: string; name: string; code: string | null }
}

export interface EmployeeBand {
  id: string
  name: string
  rank: number
}

export interface EmployeeChild {
  id: string
  fullName: string
  dateOfBirth: string
  gender: Gender
}

export interface EmployeeEducation {
  id: string
  type: EducationType
  title: string
  institution: string
  fieldOfStudy: string | null
  grade: string | null
  startDate: string
  endDate: string | null
  certificateUrl: string | null
  description: string | null
}

export interface Employee {
  /** The Staff ID (e.g. "EMP-0001") — Employee's primary key everywhere,
   *  used as the identifier in every route/link/foreign-key reference. */
  employeeNumber: string

  // Step 1: Basic Information
  firstName: string
  middleName: string | null
  lastName: string
  preferredName: string | null
  gender: Gender
  dateOfBirth: string
  nationalIdNumber: string
  nationality: string
  maritalStatus: MaritalStatus
  email: string
  phone: string
  branchId: string | null
  branch?: Branch | null
  profilePictureUrl: string | null

  // Auth (passwordHash is never returned by the API)
  isAdmin: boolean

  // Step 2: Employment Details
  contractType: ContractType | null
  employmentStartDate: string | null
  probationEndDate: string | null
  contractEndDate: string | null
  previousEmployee: boolean
  previousEmployeeNumber: string | null
  previousPositionHeld: string | null
  previousDepartment: string | null
  previousExitDate: string | null
  previousReasonForLeaving: string | null
  previousBankingExperienceYears: number | null

  // Step 3: Position Assignment
  positionId: string | null
  bandId: string | null
  reportingManagerOverrideId: string | null
  position?: EmployeePosition | null
  band?: EmployeeBand | null

  // Step 4: Family Information
  partnerName: string | null
  partnerPhone: string | null
  partnerDateOfBirth: string | null
  children?: EmployeeChild[]

  // Step 5: Education & Professional Development
  education?: EmployeeEducation[]

  employmentStatus: EmploymentStatus
  isActive: boolean

  // Exit Management
  exitInitiatedAt: string | null
  exitInitiatedById: string | null
  exitDate: string | null
  exitReason: ExitReason | null
  exitType: ExitType | null
  nextMove: string | null
  exitComments: string | null
}

export type FormInstanceStatus = "DRAFT" | "ASSIGNED" | "IN_PROGRESS" | "SUBMITTED" | "PENDING_SIGNATURES" | "REJECTED" | "COMPLETED" | "ARCHIVED"

export interface ExitFormStatus {
  id: string
  status: FormInstanceStatus
  assignmentDate: string
  dueDate: string | null
  submittedAt: string | null
  completedAt: string | null
  formTemplate: { title: string }
}

/** The auto-assigned Exit Clearance Form's current progress, for HR's exit
 *  tracker — see ExitProcessService.getExitFormStatus() on the backend.
 *  Returns null if exit hasn't been initiated (or the template is missing). */
export function fetchExitFormStatus(id: string) {
  return apiFetchSafe<ExitFormStatus | null>(`/employees/${id}/exit-form-status`)
}

export interface PositionHistoryEntry {
  id: string
  changeType: string
  changeReason: string | null
  effectiveFrom: string
  effectiveTo: string | null
  position: { id: string; title: string }
  band: { id: string; name: string }
}

export interface ReportingManagerResult {
  manager: { id: string; firstName: string; lastName: string; positionId: string } | null
  source: "OVERRIDE" | "POSITION_HIERARCHY" | "NONE"
  candidates?: { id: string; firstName: string; lastName: string }[]
}

export function fetchEmployees(includeInactive = false) {
  return apiFetchSafe<Employee[]>(`/employees${includeInactive ? "?includeInactive=true" : ""}`)
}

/** Paginated version for the Employees admin table — see lib/api/pagination.ts. */
export function fetchEmployeesPaginated(params: {
  includeInactive?: boolean
  page?: number
  pageSize?: number
}) {
  const search = new URLSearchParams()
  if (params.includeInactive) search.set("includeInactive", "true")
  search.set("page", String(params.page ?? 1))
  if (params.pageSize) search.set("pageSize", String(params.pageSize))
  return apiFetchSafe<PaginatedResult<Employee>>(`/employees?${search.toString()}`)
}

export function fetchEmployee(id: string) {
  return apiFetchSafe<Employee>(`/employees/${id}`)
}

export function fetchEmployeeByNumber(employeeNumber: string) {
  return apiFetchSafe<Employee>(`/employees/by-number/${employeeNumber}`)
}

export function fetchEmployeeHistory(id: string) {
  return apiFetchSafe<PositionHistoryEntry[]>(`/employees/${id}/history`)
}

export function fetchReportingManager(id: string) {
  return apiFetchSafe<ReportingManagerResult>(`/employees/${id}/reporting-manager`)
}

export interface LineManagerSummary {
  id: string
  firstName: string
  lastName: string
}

/** Batch lookup backing the employee list's Line Manager column — see
 *  EmployeesService.getLineManagersBatch() for why this exists instead of
 *  calling fetchReportingManager() once per row. */
export function fetchLineManagersBatch() {
  return apiFetchSafe<Record<string, LineManagerSummary | null>>("/employees/line-managers")
}

// ---- Computed display fields (Tenure, Total Banking Experience) --------------
// Both are derived purely from fields the API already returns, so they're
// computed on read here rather than stored or round-tripped through the
// backend — same "computed on read" convention used across every other
// module this session (onboarding progress %, leave carry-forward expiry).

export interface Tenure {
  years: number
  months: number
  totalYears: number
}

/** Current Date − Employment Start Date, in whole years + remainder months. */
export function computeTenure(employmentStartDate: string | null): Tenure | null {
  if (!employmentStartDate) return null
  const start = new Date(employmentStartDate)
  if (Number.isNaN(start.getTime())) return null

  const now = new Date()
  let years = now.getFullYear() - start.getFullYear()
  let months = now.getMonth() - start.getMonth()
  if (now.getDate() < start.getDate()) months -= 1
  if (months < 0) {
    years -= 1
    months += 12
  }
  if (years < 0) return null

  return { years, months, totalYears: years + months / 12 }
}

export function formatTenure(tenure: Tenure | null): string {
  if (!tenure) return "—"
  return `${tenure.years} Year${tenure.years === 1 ? "" : "s"} ${tenure.months} Month${tenure.months === 1 ? "" : "s"}`
}

/** Previous Banking Experience (HR-entered) + Current Banking Experience
 *  (tenure at NCBA, computed) — see the spec's Employee Table Enhancements. */
export function computeTotalBankingExperienceYears(employee: Pick<Employee, "previousBankingExperienceYears" | "employmentStartDate">): number | null {
  const previous = employee.previousBankingExperienceYears ?? 0
  const tenure = computeTenure(employee.employmentStartDate)
  if (employee.previousBankingExperienceYears === null && !tenure) return null
  return Math.round((previous + (tenure?.totalYears ?? 0)) * 10) / 10
}
