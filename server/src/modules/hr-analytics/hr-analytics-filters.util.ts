import { Prisma } from "@prisma/client"

/**
 * The dashboard's global filter set — every KPI/chart endpoint accepts this
 * same shape (spec: "global filters that affect all cards, charts, and
 * reports"). Follows this codebase's established analytics-filter
 * convention (plain interface + parseFilters() in the controller, see
 * PerformanceAnalyticsFilters/LearningAnalyticsFilters) rather than a
 * class-validator DTO, for consistency with the modules this one composes.
 */
export interface HrAnalyticsFilters {
  // --- Date dimension --- one of these wins, in this priority order:
  // dateFrom/dateTo > years (multi-year compare) > year+month/quarter > year.
  dateFrom?: string
  dateTo?: string
  /** Multi-year compare, e.g. ?years=2024,2025,2026 — parsed by the
   *  controller into number[]. When set, callers that build a single trend
   *  series (bandDistributionTrend, averageAgeTrend, exitTrend) use this
   *  directly instead of resolving one dateFrom/dateTo range. */
  years?: number[]
  year?: number
  month?: number // 1-12
  quarter?: number // 1-4

  // --- Org dimensions ---
  departmentId?: string
  functionId?: string
  unitId?: string
  branchId?: string
  positionId?: string
  levelId?: string
  bandId?: string
  contractType?: string
  gender?: string
  employmentStatus?: string

  // --- Role-scoping (set by the controller from HrAnalyticsAccessService,
  // never accepted from the client query string) — restricts every Employee
  // query in this module to what a non-admin actor is allowed to see, on
  // top of whatever org-dimension filters they explicitly chose above. ---
  scopeAllowAll?: boolean
  scopeEmployeeIds?: string[]
  scopeDepartmentIds?: string[]
}

/** Resolves the filter's date dimension into a concrete [from, to] range.
 *  Falls back to "all time" (undefined/undefined) when nothing is set. */
export function resolveDateRange(filters: HrAnalyticsFilters): { from?: Date; to?: Date } {
  if (filters.dateFrom || filters.dateTo) {
    return {
      from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      to: filters.dateTo ? new Date(filters.dateTo) : undefined,
    }
  }

  if (!filters.year) return {}

  if (filters.quarter) {
    const startMonth = (filters.quarter - 1) * 3
    return {
      from: new Date(Date.UTC(filters.year, startMonth, 1)),
      to: new Date(Date.UTC(filters.year, startMonth + 3, 0, 23, 59, 59)),
    }
  }

  if (filters.month) {
    return {
      from: new Date(Date.UTC(filters.year, filters.month - 1, 1)),
      to: new Date(Date.UTC(filters.year, filters.month, 0, 23, 59, 59)),
    }
  }

  return {
    from: new Date(Date.UTC(filters.year, 0, 1)),
    to: new Date(Date.UTC(filters.year, 11, 31, 23, 59, 59)),
  }
}

/** The org-dimension + demographic portion of the filter set, as a Prisma
 *  EmployeeWhereInput fragment — shared by every query in this module that
 *  starts from Employee. Deliberately excludes the date dimension: callers
 *  decide for themselves whether a given KPI's date range applies to
 *  employmentStartDate, exitDate, or something else entirely. */
export function buildEmployeeDimensionWhere(filters: HrAnalyticsFilters): Prisma.EmployeeWhereInput {
  const dimensionWhere: Prisma.EmployeeWhereInput = {
    ...(filters.branchId ? { branchId: filters.branchId } : {}),
    ...(filters.bandId ? { bandId: filters.bandId } : {}),
    ...(filters.contractType ? { contractType: filters.contractType as Prisma.EmployeeWhereInput["contractType"] } : {}),
    ...(filters.gender ? { gender: filters.gender as Prisma.EmployeeWhereInput["gender"] } : {}),
    ...(filters.employmentStatus ? { employmentStatus: filters.employmentStatus as Prisma.EmployeeWhereInput["employmentStatus"] } : {}),
    ...(filters.departmentId || filters.functionId || filters.unitId || filters.positionId || filters.levelId
      ? {
          position: {
            ...(filters.positionId ? { id: filters.positionId } : {}),
            ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
            ...(filters.unitId ? { unitId: filters.unitId } : {}),
            ...(filters.levelId ? { levelId: filters.levelId } : {}),
            ...(filters.functionId ? { department: { functionId: filters.functionId } } : {}),
          },
        }
      : {}),
  }

  // Role-scoping — see HrAnalyticsFilters' doc comment. Combined with an
  // explicit AND so a non-admin's scope restriction can never be widened by
  // whatever org-dimension filters they picked (those still narrow further,
  // via the fields above sitting in the same top-level AND-implicit object).
  if (filters.scopeAllowAll === false) {
    const scopeOr: Prisma.EmployeeWhereInput[] = [
      ...(filters.scopeEmployeeIds?.length ? [{ employeeNumber: { in: filters.scopeEmployeeIds } }] : []),
      ...(filters.scopeDepartmentIds?.length ? [{ position: { departmentId: { in: filters.scopeDepartmentIds } } }] : []),
    ]
    return { AND: [dimensionWhere, scopeOr.length ? { OR: scopeOr } : { employeeNumber: "__no_access__" }] }
  }

  return dimensionWhere
}
