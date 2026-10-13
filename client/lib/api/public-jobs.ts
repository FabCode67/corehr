/** Unauthenticated calls behind the public /jobs pages — plain fetch, no
 *  session cookie, so these pages work for anyone with the link. */
const API_BASE_URL = process.env.API_URL ?? "http://localhost:4000/api"

export interface PublicJobSummary {
  postingTitle: string
  shareSlug: string
  closingDate: string
  employmentType: string
  branch: { name: string }
}

export interface PublicJob {
  id: string
  postingTitle: string
  description: string
  responsibilities: string
  qualifications: string
  requiredExperience: string | null
  employmentType: string
  closingDate: string
  publishedAt: string | null
  shareSlug: string
  requiredDocuments: string[]
  branch: { name: string }
  summary: string | null
  open: boolean
}

async function get<T>(path: string): Promise<{ ok: true; data: T } | { ok: false; status?: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" })
    if (!response.ok) return { ok: false, status: response.status }
    return { ok: true, data: (await response.json()) as T }
  } catch {
    return { ok: false }
  }
}

export const fetchPublicJobs = () => get<PublicJobSummary[]>("/public/jobs")
export const fetchPublicJob = (slug: string) => get<PublicJob>(`/public/jobs/${encodeURIComponent(slug)}`)
