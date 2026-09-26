/**
 * Pure, dependency-free constants/types pulled out of
 * lib/api/annual-leave-plan.ts.
 *
 * annual-leave-plan.ts imports apiFetchSafe from ./client, which imports
 * next/headers's cookies() — fine for its Server Component/Action fetchers,
 * but poison for any "use client" component that also wants a plain
 * constant like the ones below, since Turbopack's Server/Client boundary
 * check is per-file, not per-export (see export-urls.ts and siblings for
 * the same pattern elsewhere in lib/api).
 */

export const MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const

export type MonthKey = (typeof MONTH_KEYS)[number]

export const MONTH_LABELS: Record<MonthKey, string> = {
  january: "Jan",
  february: "Feb",
  march: "Mar",
  april: "Apr",
  may: "May",
  june: "Jun",
  july: "Jul",
  august: "Aug",
  september: "Sep",
  october: "Oct",
  november: "Nov",
  december: "Dec",
}
