import { apiFetchSafe } from "./client"
import type { PaginatedResult } from "./pagination"

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
  /** Genuine Department-to-Department hierarchy, distinct from Function —
   *  see the schema's Department.parentDepartmentId doc comment. Scope:
   *  import + storage + this admin page only; org chart/dashboards/filters
   *  elsewhere in the app stay Function-based. */
  parentDepartmentId: string | null
  function?: OrgFunction
  parentDepartment?: { id: string; name: string } | null
  units?: DepartmentUnit[]
}

export function fetchFunctions() {
  return apiFetchSafe<OrgFunction[]>("/organization/functions")
}

export function fetchDepartments() {
  return apiFetchSafe<Department[]>("/organization/departments?includeInactive=true")
}

/** Paginated version for the Departments admin table — see lib/api/pagination.ts. */
export function fetchDepartmentsPaginated(page: number, pageSize?: number, search?: string) {
  const query = new URLSearchParams({ includeInactive: "true", page: String(page) })
  if (pageSize) query.set("pageSize", String(pageSize))
  if (search) query.set("search", search)
  return apiFetchSafe<PaginatedResult<Department>>(`/organization/departments?${query.toString()}`)
}

export function fetchDepartment(id: string) {
  return apiFetchSafe<Department>(`/organization/departments/${id}`)
}

export interface UnitWithDepartment extends DepartmentUnit {
  department: { id: string; name: string }
}

/** All units across every department, for pickers that need every unit
 *  regardless of parent department (e.g. Course eligibility restrictions). */
export function fetchUnits() {
  return apiFetchSafe<UnitWithDepartment[]>("/organization/units?includeInactive=true")
}
