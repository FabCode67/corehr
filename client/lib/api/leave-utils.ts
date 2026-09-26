/**
 * Pure, dependency-free helpers pulled out of lib/api/leave.ts.
 *
 * leave.ts imports apiFetchSafe from ./client, which imports next/headers's
 * cookies() — fine for its Server Component/Action fetchers, but poison for
 * any "use client" component that also wants one of the plain
 * constants/formatters below, since Turbopack's Server/Client boundary
 * check is per-file, not per-export (see export-urls.ts and
 * employee-utils.ts for the same pattern elsewhere in lib/api).
 */

import type { LeaveCategory, LeaveEntitlementCategory, LeaveRequestStatus } from "./leave"

export const LEAVE_ENTITLEMENT_CATEGORIES: LeaveEntitlementCategory[] = [
  "PERMANENT",
  "TEMPORARY",
  "GRADUATE_TRAINEE",
  "INTERN",
  "MANAGING_DIRECTOR",
]

export const LEAVE_CATEGORIES: LeaveCategory[] = [
  "ANNUAL",
  "MATERNITY",
  "PATERNITY",
  "SICK",
  "COMPASSIONATE",
  "OTHER",
]

export function formatLeaveStatusLabel(status: LeaveRequestStatus) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ")
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]
