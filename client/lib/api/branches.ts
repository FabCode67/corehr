import { apiFetchSafe } from "./client"
import type { PaginatedResult } from "./pagination"

export interface Branch {
  id: string
  name: string
  code: string | null
  isHeadquarters: boolean
  isActive: boolean
}

/** Full, unpaginated list — used by the employee form and leave filter bars
 *  (approvals/calendar/analytics). See fetchBranchesPaginated() for the
 *  admin table view. */
export function fetchBranches(includeInactive = false) {
  const search = includeInactive ? "?includeInactive=true" : ""
  return apiFetchSafe<Branch[]>(`/branches${search}`)
}

/** Paginated version for the Branches admin table. */
export function fetchBranchesPaginated(page: number, pageSize?: number) {
  const search = new URLSearchParams({ includeInactive: "true", page: String(page) })
  if (pageSize) search.set("pageSize", String(pageSize))
  return apiFetchSafe<PaginatedResult<Branch>>(`/branches?${search.toString()}`)
}

export function fetchBranch(id: string) {
  return apiFetchSafe<Branch>(`/branches/${id}`)
}
