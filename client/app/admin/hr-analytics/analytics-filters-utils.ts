import type { HrAnalyticsFilters } from "@/lib/api/hr-analytics"

export type AnalyticsSearchParams = Record<string, string | undefined>

/** Reads the shared analytics filter query params (see AnalyticsFilters). */
export function parseAnalyticsFilters(raw: AnalyticsSearchParams): HrAnalyticsFilters {
  return {
    dateFrom: raw.dateFrom,
    dateTo: raw.dateTo,
    years: raw.years,
    year: raw.year,
    month: raw.month,
    quarter: raw.quarter,
    departmentId: raw.departmentId,
    functionId: raw.functionId,
    unitId: raw.unitId,
    branchId: raw.branchId,
    positionId: raw.positionId,
    levelId: raw.levelId,
    bandId: raw.bandId,
    contractType: raw.contractType,
    gender: raw.gender,
    employmentStatus: raw.employmentStatus,
  }
}
