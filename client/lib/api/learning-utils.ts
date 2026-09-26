/**
 * Pure, dependency-free helpers pulled out of lib/api/learning.ts.
 *
 * learning.ts imports apiFetchSafe from ./client, which imports
 * next/headers's cookies() — fine for its Server Component/Action fetchers,
 * but poison for any "use client" component that also wants one of the
 * plain label maps/constants below, since Turbopack's Server/Client
 * boundary check is per-file, not per-export (see export-urls.ts and
 * siblings for the same pattern elsewhere in lib/api). No "use client"
 * component uses these today, but keeping them here avoids the next
 * Turbopack surprise the day one does.
 */

import type { CourseAssignmentPriority, CourseAssignmentStatus, CourseDeliveryMethod } from "./learning"

export const DELIVERY_METHOD_LABELS: Record<CourseDeliveryMethod, string> = {
  CLASSROOM: "Classroom",
  ONLINE: "Online",
  HYBRID: "Hybrid",
}

export const PRIORITY_LABELS: Record<CourseAssignmentPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
}

export const ASSIGNMENT_STATUS_LABELS: Record<CourseAssignmentStatus, string> = {
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  IN_PROGRESS: "In Progress",
  COMPLETED_BY_EMPLOYEE: "Completed (awaiting certificate)",
  PENDING_VERIFICATION: "Pending HR Verification",
  VERIFIED: "Verified",
  REJECTED: "Certificate Rejected",
  CLOSED: "Closed",
}

/** Assignment statuses that count as "done" for completion-rate math —
 *  mirrors the server's TERMINAL_STATUSES in assignments.service.ts /
 *  analytics.service.ts. */
export const TERMINAL_ASSIGNMENT_STATUSES: CourseAssignmentStatus[] = ["VERIFIED", "CLOSED"]
