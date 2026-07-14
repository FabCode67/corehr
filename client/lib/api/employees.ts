import { apiFetchSafe } from "./client"

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

export const WORK_LOCATIONS = [
  "HEADQUARTERS",
  "KIGALI_HEIGHTS_BRANCH",
  "DOWNTOWN_BRANCH",
  "REMERA_BRANCH",
  "NYABUGOGO_BRANCH",
  "GISOZI_BRANCH",
  "RUSIZI_BRANCH",
  "MUSANZE_BRANCH",
  "KAYONZA_BRANCH",
  "RUBAVU_BRANCH",
] as const
export type WorkLocation = (typeof WORK_LOCATIONS)[number]

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
  id: string
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
  workLocation: WorkLocation
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
  exitDate: string | null
  exitReason: ExitReason | null
  exitType: ExitType | null
  nextMove: string | null
  exitComments: string | null
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
