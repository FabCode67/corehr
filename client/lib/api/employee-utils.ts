/**
 * Pure, dependency-free helpers pulled out of lib/api/employees.ts.
 *
 * employees.ts imports apiFetchSafe from ./client, which imports
 * next/headers's cookies() — fine for the Server Component/Action fetchers
 * that live there, but poison for any "use client" component that also
 * wants one of the plain formatting/computation helpers below, since
 * Turbopack's Server/Client boundary check is per-file, not per-export (see
 * export-urls.ts's doc comment for the fuller explanation of the same
 * pattern). Keeping these here, with zero imports from ./client or any
 * other lib/api/*.ts file that imports it, means Client Components can use
 * them freely.
 */

import type { Employee } from "./employees"

export function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ")
}

export interface Tenure {
  years: number
  months: number
  totalYears: number
}

/** Current Date − Employment Start Date, in whole years + remainder months. */
export function computeTenure(employmentStartDate: string | null): Tenure | null {
  if (!employmentStartDate) return null
  const start = new Date(employmentStartDate)
  if (Number.isNaN(start.getTime())) return null

  const now = new Date()
  let years = now.getFullYear() - start.getFullYear()
  let months = now.getMonth() - start.getMonth()
  if (now.getDate() < start.getDate()) months -= 1
  if (months < 0) {
    years -= 1
    months += 12
  }
  if (years < 0) return null

  return { years, months, totalYears: years + months / 12 }
}

export function formatTenure(tenure: Tenure | null): string {
  if (!tenure) return "—"
  return `${tenure.years} Year${tenure.years === 1 ? "" : "s"} ${tenure.months} Month${tenure.months === 1 ? "" : "s"}`
}

/** Previous Banking Experience (HR-entered) + Current Banking Experience
 *  (tenure at NCBA, computed) — see the spec's Employee Table Enhancements. */
export function computeTotalBankingExperienceYears(employee: Pick<Employee, "previousBankingExperienceYears" | "employmentStartDate">): number | null {
  const previous = employee.previousBankingExperienceYears ?? 0
  const tenure = computeTenure(employee.employmentStartDate)
  if (employee.previousBankingExperienceYears === null && !tenure) return null
  return Math.round((previous + (tenure?.totalYears ?? 0)) * 10) / 10
}

/** Days remaining until Employee.probationEndDate — null when the employee
 *  has no probation end date set at all (most staff, once probation is
 *  over and HR hasn't left a stale date on the record). Negative once the
 *  date has already passed; the Employees table renders that case as
 *  "Completed" rather than a negative day count. Same day-granularity
 *  midnight-to-midnight math as ProbationReminderScheduler on the backend,
 *  so this reads consistently with the "in N days" wording in that
 *  reminder's notification/email. */
export function computeProbationRemainingDays(probationEndDate: string | null): number | null {
  if (!probationEndDate) return null
  const end = new Date(probationEndDate)
  if (Number.isNaN(end.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  return Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
