/**
 * Mirrors server/src/modules/organization/org-chart/org-chart.service.ts's
 * OrgChartNode shape. Kept as a plain duplicate (not a shared package)
 * since the client and server are separately deployable apps — if the API
 * shape changes, TypeScript here won't catch it automatically, so update
 * both sides together.
 */
export interface OrgChartEmployee {
  id: string
  firstName: string
  lastName: string
}

export interface OrgChartLevel {
  id: string
  name: string
  /** Short badge for compact display, e.g. "E1", "F2" — may be unset. */
  code: string | null
  rank: number
  track: "STANDARD" | "EXECUTIVE"
}

export interface OrgChartNode {
  id: string
  title: string
  department: { id: string; name: string }
  unit: { id: string; name: string } | null
  level: OrgChartLevel
  employees: OrgChartEmployee[]
  directReports: OrgChartNode[]
}

export type OrgChartResult =
  | { ok: true; data: OrgChartNode[] }
  | { ok: false; error: string }

/**
 * Fetches the org chart from the NestJS API. Intended for Server
 * Components only — it reads `API_URL` (deliberately not
 * `NEXT_PUBLIC_API_URL`, since this should never run in the browser).
 * Never throws — callers get a typed result so the page can render a
 * friendly state if the API is unreachable instead of crashing.
 */
export async function fetchOrgChart(): Promise<OrgChartResult> {
  const baseUrl = process.env.API_URL ?? "http://localhost:4000/api"

  try {
    const response = await fetch(`${baseUrl}/organization/org-chart`, {
      cache: "no-store",
    })

    if (!response.ok) {
      return {
        ok: false,
        error: `The API responded with ${response.status} ${response.statusText}.`,
      }
    }

    const data = (await response.json()) as OrgChartNode[]
    return { ok: true, data }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? `Could not reach the API at ${baseUrl} — ${error.message}`
          : `Could not reach the API at ${baseUrl}.`,
    }
  }
}
