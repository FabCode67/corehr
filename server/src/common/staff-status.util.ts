import type { ActiveStaffStatus, EmploymentStatus, ExitReason } from "@prisma/client"

/**
 * BNR/EDWH Staff Status codes (replaces the earlier 0/1/9 mapping). Mirrored
 * for display in client/lib/api/employee-utils.ts — keep the two in sync.
 */
export const STAFF_STATUS_CODE = {
  ACTIVE: 1,
  SUSPENDED: 2,
  RESIGNED: 3,
  TERMINATED: 4,
  RETIRED: 5,
  DECEASED: 6,
  PROBATION: 7,
  END_OF_CONTRACT: 8,
  DISABILITY: 9,
} as const

export const STAFF_STATUS_LABEL: Record<number, string> = {
  1: "Active",
  2: "Suspended",
  3: "Resigned",
  4: "Terminated",
  5: "Retired",
  6: "Deceased",
  7: "Probation",
  8: "End of Contract",
  9: "Disability",
}

const EXIT_REASON_TO_CODE: Record<ExitReason, number> = {
  RESIGNATION: STAFF_STATUS_CODE.RESIGNED,
  TERMINATION: STAFF_STATUS_CODE.TERMINATED,
  END_OF_CONTRACT: STAFF_STATUS_CODE.END_OF_CONTRACT,
  RETIREMENT: STAFF_STATUS_CODE.RETIRED,
  DECEASED: STAFF_STATUS_CODE.DECEASED,
}

/**
 * The employee's current EDWH Staff Status code, from their real state:
 * - exited → by exit reason (Resigned/Terminated/Retired/Deceased/End of
 *   Contract); null if somehow exited with no reason on file;
 * - still employed with a manual override → Suspended or Disability;
 * - still on probation (probationEndDate in the future) → Probation;
 * - otherwise Active.
 */
export function computeStaffStatusCode(
  employee: {
    employmentStatus: EmploymentStatus
    exitReason: ExitReason | null
    activeStatusOverride: ActiveStaffStatus | null
    probationEndDate: Date | null
  },
  now: Date = new Date()
): number | null {
  if (employee.employmentStatus === "EXIT") {
    return employee.exitReason ? EXIT_REASON_TO_CODE[employee.exitReason] : null
  }
  if (employee.activeStatusOverride === "SUSPENDED") return STAFF_STATUS_CODE.SUSPENDED
  if (employee.activeStatusOverride === "DISABILITY") return STAFF_STATUS_CODE.DISABILITY
  if (employee.probationEndDate && employee.probationEndDate > now) return STAFF_STATUS_CODE.PROBATION
  return STAFF_STATUS_CODE.ACTIVE
}
