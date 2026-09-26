/**
 * Pure, dependency-free helpers pulled out of lib/api/performance.ts.
 *
 * performance.ts imports apiFetchSafe from ./client, which imports
 * next/headers's cookies() — fine for its Server Component/Action fetchers,
 * but poison for any "use client" component that also wants one of the
 * plain label maps below, since Turbopack's Server/Client boundary check is
 * per-file, not per-export (see export-urls.ts and siblings for the same
 * pattern elsewhere in lib/api). No "use client" component uses these
 * today, but keeping them here avoids the next Turbopack surprise the day
 * one does.
 */

import type { PerformanceReviewStatus, PerformanceReviewType } from "./performance"

export const REVIEW_TYPE_LABELS: Record<PerformanceReviewType, string> = {
  MID_YEAR: "Mid-Year Review",
  ANNUAL: "Annual Review",
}

export const REVIEW_STATUS_LABELS: Record<PerformanceReviewStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  ACKNOWLEDGED: "Acknowledged",
  FINALIZED: "Finalized",
}
