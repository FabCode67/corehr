import { apiFetchSafe } from "./client"

export type EmploymentStatus = "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "TERMINATED" | "RETIRED"

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

export interface Employee {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  positionId: string
  bandId: string
  employmentStatus: EmploymentStatus
  hireDate: string
  isActive: boolean
  position?: EmployeePosition
  band?: EmployeeBand
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

export function fetchEmployees() {
  return apiFetchSafe<Employee[]>("/employees")
}

export function fetchEmployee(id: string) {
  return apiFetchSafe<Employee>(`/employees/${id}`)
}

export function fetchEmployeeHistory(id: string) {
  return apiFetchSafe<PositionHistoryEntry[]>(`/employees/${id}/history`)
}

export function fetchReportingManager(id: string) {
  return apiFetchSafe<ReportingManagerResult>(`/employees/${id}/reporting-manager`)
}
