import { apiFetchSafe } from "./client"

function toQuery(params: Record<string, unknown>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

// ---- Document types (HR-configurable checklist catalog) ---------------------

export interface ExitDocumentType {
  id: string
  name: string
  description: string | null
  isMandatory: boolean
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function fetchExitDocumentTypes(includeInactive = false) {
  return apiFetchSafe<ExitDocumentType[]>(`/exit-documents/document-types${toQuery({ includeInactive })}`)
}

// ---- Assignments (per-employee checklist tracking) ---------------------------

interface EmployeeRef {
  employeeNumber: string
  firstName: string
  lastName: string
}

export interface ExitDocumentAssignment {
  id: string
  employeeId: string
  documentTypeId: string
  isCompleted: boolean
  notes: string | null
  assignedById: string
  assignedAt: string
  completedById: string | null
  completedAt: string | null
  documentType: ExitDocumentType
  employee: EmployeeRef
  assignedBy: EmployeeRef
  completedBy: EmployeeRef | null
  createdAt: string
  updatedAt: string
}

export function fetchExitDocumentsForEmployee(employeeId: string) {
  return apiFetchSafe<ExitDocumentAssignment[]>(`/exit-documents/assignments/employee/${employeeId}`)
}

export interface ExitDocumentProgress {
  total: number
  completed: number
  remaining: number
  percentageCompleted: number
  allCompleted: boolean
  outstanding: { id: string; documentTypeName: string; isMandatory: boolean }[]
}

export function fetchExitDocumentProgress(employeeId: string) {
  return apiFetchSafe<ExitDocumentProgress>(`/exit-documents/assignments/employee/${employeeId}/progress`)
}
