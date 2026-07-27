import { apiFetchSafe } from "./client"
import type { PaginatedResult } from "./pagination"

export interface PositionLevel {
  id: string
  name: string
  code: string | null
  rank: number
  track: "STANDARD" | "EXECUTIVE"
}

export interface Position {
  id: string
  title: string
  departmentId: string
  unitId: string | null
  levelId: string
  reportsToPositionId: string | null
  isActive: boolean
  department?: { id: string; name: string }
  unit?: { id: string; name: string } | null
  level?: PositionLevel
  reportsTo?: { id: string; title: string } | null
  directReports?: { id: string; title: string }[]
  employees?: { employeeNumber: string; firstName: string; lastName: string }[]
}

export function fetchPositions() {
  return apiFetchSafe<Position[]>("/organization/positions?includeInactive=true")
}

/** Paginated version for the Positions admin table — see lib/api/pagination.ts. */
export function fetchPositionsPaginated(page: number, pageSize?: number) {
  const search = new URLSearchParams({ includeInactive: "true", page: String(page) })
  if (pageSize) search.set("pageSize", String(pageSize))
  return apiFetchSafe<PaginatedResult<Position>>(`/organization/positions?${search.toString()}`)
}

export function fetchPosition(id: string) {
  return apiFetchSafe<Position>(`/organization/positions/${id}`)
}

export function fetchPositionLevels() {
  return apiFetchSafe<PositionLevel[]>("/organization/position-levels")
}
