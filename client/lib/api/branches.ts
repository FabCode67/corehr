import { apiFetchSafe } from "./client"
import type { PaginatedResult } from "./pagination"

export interface Branch {
  id: string
  name: string
  code: string | null
  isHeadquarters: boolean
  isActive: boolean
  latitude: number | null
  longitude: number | null
  /** Count of ACTIVE employees at this branch — present on both
   *  fetchBranches() and fetchBranchesPaginated() responses; powers the
   *  Locations map's per-pin headcount badge and the admin table. The
   *  actual roster behind a pin's "View employees" button is fetched
   *  separately, on demand, via fetchEmployeesPaginated({ branchId }) —
   *  not embedded on this object. */
  _count?: { employees: number }
}

/** Full, unpaginated list — used by the employee form, leave filter bars
 *  (approvals/calendar/analytics), and plain branch-picker dropdowns. See
 *  fetchBranchesPaginated() for the admin table view. */
export function fetchBranches(includeInactive = false) {
  const search = includeInactive ? "?includeInactive=true" : ""
  return apiFetchSafe<Branch[]>(`/branches${search}`)
}

/** Paginated version for the Branches admin table. */
export function fetchBranchesPaginated(page: number, pageSize?: number, search?: string) {
  const query = new URLSearchParams({ includeInactive: "true", page: String(page) })
  if (pageSize) query.set("pageSize", String(pageSize))
  if (search) query.set("search", search)
  return apiFetchSafe<PaginatedResult<Branch>>(`/branches?${query.toString()}`)
}

export function fetchBranch(id: string) {
  return apiFetchSafe<Branch>(`/branches/${id}`)
}
