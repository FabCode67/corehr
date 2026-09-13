import { apiFetchSafe } from "./client"

function toQuery(params: Record<string, unknown>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

// ---- Templates (HR-configurable clearance form catalog) --------------------

export interface ClearanceFormTemplate {
  id: string
  name: string
  description: string | null
  isMandatory: boolean
  responsibleDepartmentId: string
  responsiblePositionId: string
  requiresEmployeeCompletion: boolean
  requiresConfirmation: boolean
  requiresSignature: boolean
  daysToComplete: number
  sortOrder: number
  isActive: boolean
  responsibleDepartment: { id: string; name: string }
  responsiblePosition: { id: string; title: string }
  createdAt: string
  updatedAt: string
}

export function fetchClearanceFormTemplates(includeInactive = false) {
  return apiFetchSafe<ClearanceFormTemplate[]>(`/exit-clearance/templates${toQuery({ includeInactive })}`)
}

export function fetchClearanceFormTemplate(id: string) {
  return apiFetchSafe<ClearanceFormTemplate>(`/exit-clearance/templates/${id}`)
}

// ---- Assignments (per-employee clearance tracking) --------------------------

interface EmployeeRef {
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
}

export type ExitClearanceStatus = "PENDING" | "COMPLETED" | "REJECTED"

export interface ExitClearanceAssignment {
  id: string
  employeeId: string
  templateId: string
  status: ExitClearanceStatus
  dueDate: string
  employeeCompletedAt: string | null
  employeeCompletedById: string | null
  confirmedAt: string | null
  confirmedById: string | null
  signedAt: string | null
  signedById: string | null
  lastActionComment: string | null
  lastReminderSentAt: string | null
  assignedById: string
  assignedAt: string
  template: ClearanceFormTemplate
  employee: EmployeeRef
  assignedBy: EmployeeRef
  employeeCompletedBy: EmployeeRef | null
  confirmedBy: EmployeeRef | null
  signedBy: EmployeeRef | null
  isOverdue?: boolean
  readyForReview?: boolean
  createdAt: string
  updatedAt: string
}

export function fetchExitClearanceForEmployee(employeeId: string) {
  return apiFetchSafe<ExitClearanceAssignment[]>(`/exit-clearance/assignments/employee/${employeeId}`)
}

export interface ExitClearanceProgress {
  total: number
  completed: number
  pending: number
  rejected: number
  overdue: number
  allMandatoryCompleted: boolean
  mandatoryOutstanding: { id: string; name: string; status: ExitClearanceStatus }[]
  assignments: (ExitClearanceAssignment & { isOverdue: boolean })[]
}

export function fetchExitClearanceProgress(employeeId: string) {
  return apiFetchSafe<ExitClearanceProgress>(`/exit-clearance/assignments/employee/${employeeId}/progress`)
}

export function fetchReviewerQueue(employeeId: string) {
  return apiFetchSafe<(ExitClearanceAssignment & { isOverdue: boolean; readyForReview: boolean })[]>(`/exit-clearance/assignments/reviewer/${employeeId}/queue`)
}

export interface ExitClearanceHrDashboard {
  counts: { completed: number; pending: number; rejected: number; overdue: number }
  employees: {
    employee: EmployeeRef
    total: number
    completed: number
    pending: number
    rejected: number
    overdue: number
  }[]
  assignments: (ExitClearanceAssignment & { isOverdue: boolean })[]
}

export function fetchExitClearanceHrDashboard() {
  return apiFetchSafe<ExitClearanceHrDashboard>("/exit-clearance/assignments/hr-dashboard")
}
