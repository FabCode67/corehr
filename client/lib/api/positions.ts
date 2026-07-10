import { apiFetchSafe } from "./client"

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
  employees?: { id: string; firstName: string; lastName: string }[]
}

export function fetchPositions() {
  return apiFetchSafe<Position[]>("/organization/positions?includeInactive=true")
}

export function fetchPosition(id: string) {
  return apiFetchSafe<Position>(`/organization/positions/${id}`)
}

export function fetchPositionLevels() {
  return apiFetchSafe<PositionLevel[]>("/organization/position-levels")
}
