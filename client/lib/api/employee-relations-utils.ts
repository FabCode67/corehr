/**
 * Pure, dependency-free helpers pulled out of lib/api/employee-relations.ts.
 *
 * employee-relations.ts imports apiFetchSafe from ./client, which imports
 * next/headers's cookies() — fine for its Server Component/Action fetchers,
 * but poison for any "use client" component that also wants one of the
 * plain label maps/formatters below, since Turbopack's Server/Client
 * boundary check is per-file, not per-export (see export-urls.ts and
 * siblings for the same pattern elsewhere in lib/api).
 */

import type { DisciplinaryCaseStatus, GrievanceStatus } from "./employee-relations"

export const CASE_STATUS_LABELS: Record<DisciplinaryCaseStatus, string> = {
  DRAFT: "Draft",
  UNDER_INVESTIGATION: "Under Investigation",
  PENDING_DECISION: "Pending Decision",
  SANCTION_ISSUED: "Sanction Issued",
  CLOSED: "Closed",
  APPEALED: "Appealed",
}

export const CASE_STATUS_BADGE_VARIANT: Record<DisciplinaryCaseStatus, "outline" | "success" | "secondary" | "destructive" | "default"> = {
  DRAFT: "outline",
  UNDER_INVESTIGATION: "default",
  PENDING_DECISION: "default",
  SANCTION_ISSUED: "secondary",
  CLOSED: "success",
  APPEALED: "destructive",
}

export const GRIEVANCE_STATUS_LABELS: Record<GrievanceStatus, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
}

export function formatErEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ")
}
