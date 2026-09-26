import { apiFetchCached, apiFetchSafe } from "./client"
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
  /** Employee.employeeNumber of this department's designated Head of
   *  Department — see the schema's Department.headOfDepartmentId doc
   *  comment. Was previously settable only via Bulk Import; now also
   *  editable from this Details form. */
  headOfDepartmentId: string | null
  /** Employee.employeeNumber of this department's temporary Acting Head of
   *  Department — a stand-in with identical access while the real head is
   *  out or the position is vacant. See the schema's
   *  Department.actingHeadOfDepartmentId doc comment. Manually set/cleared
   *  by HR Admin from this Details form; no auto-expiry. */
  actingHeadOfDepartmentId: string | null
  function?: OrgFunction
  parentDepartment?: { id: string; name: string } | null
  headOfDepartment?: { employeeNumber: string; firstName: string; middleName: string | null; lastName: string } | null
  actingHeadOfDepartment?: { employeeNumber: string; firstName: string; middleName: string | null; lastName: string } | null
  units?: DepartmentUnit[]
}

/** Functions (a handful of org-wide rows, edited rarely) — cached for 5
 *  minutes rather than re-queried on every page load. */
export function fetchFunctions() {
  return apiFetchCached<OrgFunction[]>("/organization/functions", 300)
}

/** Departments barely change day to day — cached for 5 minutes. Callers
 *  that need to reflect a just-made edit immediately (e.g. right after
 *  creating/editing a department) should still work: server actions
 *  `revalidatePath()` the pages that show this data, and Next's cache
 *  respects that regardless of the `next.revalidate` window here. */
export function fetchDepartments() {
  return apiFetchCached<Department[]>("/organization/departments?includeInactive=true", 300)
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
