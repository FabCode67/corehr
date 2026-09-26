import { apiFetchCached } from "./client"

export interface Band {
  id: string
  name: string
  rank: number
  description: string | null
  isActive: boolean
}

/** Bands barely change (a handful of rows, edited rarely by HR admins) —
 *  cached for 5 minutes rather than re-queried on every page load. */
export function fetchBands() {
  return apiFetchCached<Band[]>("/organization/bands", 300)
}
