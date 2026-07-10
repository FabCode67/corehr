import { apiFetchSafe } from "./client"

export interface Band {
  id: string
  name: string
  rank: number
  description: string | null
  isActive: boolean
}

export function fetchBands() {
  return apiFetchSafe<Band[]>("/organization/bands")
}
