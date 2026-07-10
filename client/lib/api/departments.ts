import { apiFetchSafe } from "./client"

export interface OrgFunction {
  id: string
  name: string
  code: string | null
  isActive: boolean
}

export interface DepartmentUnit {
  id: string
  departmentId: string
  name: string
  code: string | null
  description: string | null
  isActive: boolean
}

export interface Department {
  id: string
  functionId: string
  name: string
  code: string | null
  description: string | null
  isActive: boolean
  function?: OrgFunction
  units?: DepartmentUnit[]
}

export function fetchFunctions() {
  return apiFetchSafe<OrgFunction[]>("/organization/functions")
}

export function fetchDepartments() {
  return apiFetchSafe<Department[]>("/organization/departments?includeInactive=true")
}

export function fetchDepartment(id: string) {
  return apiFetchSafe<Department>(`/organization/departments/${id}`)
}
