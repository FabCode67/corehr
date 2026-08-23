import { Injectable } from "@nestjs/common"

import { ContractType, Gender, PerformanceReviewType, Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

export interface PerformanceAnalyticsFilters {
  periodId?: string
  year?: number
  reviewType?: PerformanceReviewType
  departmentId?: string
  unitId?: string
  branchId?: string
  positionId?: string
  levelId?: string
  bandId?: string
  contractType?: string
  gender?: string
  employeeId?: string
  functionId?: string
}

const ANALYTICS_SELECT = {
  id: true,
  overallRating: true,
  reviewType: true,
  status: true,
  employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
  reviewer: { select: { firstName: true, lastName: true } },
  department: { select: { id: true, name: true, functionId: true, function: { select: { id: true, name: true } } } },
  unit: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  level: { select: { id: true, name: true } },
  band: { select: { id: true, name: true } },
  contractType: true,
  gender: true,
  period: { select: { id: true, name: true, year: true } },
} as const

/**
 * Executive reporting over performance review data. Same approach as
 * LeaveAnalyticsService: fetch a filtered, already-access-relevant slice and
 * aggregate in JS with Maps — simplest to keep correct across this many
 * filter/group-by combinations, and fine at HR-system scale.
 *
 * Only reviews with a rating that's left DRAFT status count towards
 * analytics (SUBMITTED/ACKNOWLEDGED/FINALIZED) — an in-progress draft
 * shouldn't skew department averages or distributions.
 */
@Injectable()
export class PerformanceAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(filters: PerformanceAnalyticsFilters): Prisma.PerformanceReviewWhereInput {
    return {
      status: { not: "DRAFT" },
      overallRating: { not: null },
      ...(filters.periodId ? { periodId: filters.periodId } : {}),
      ...(filters.year ? { period: { year: filters.year } } : {}),
      ...(filters.reviewType ? { reviewType: filters.reviewType } : {}),
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.unitId ? { unitId: filters.unitId } : {}),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.positionId ? { positionId: filters.positionId } : {}),
      ...(filters.levelId ? { levelId: filters.levelId } : {}),
      ...(filters.bandId ? { bandId: filters.bandId } : {}),
      ...(filters.contractType ? { contractType: filters.contractType as ContractType } : {}),
      ...(filters.gender ? { gender: filters.gender as Gender } : {}),
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.functionId ? { department: { functionId: filters.functionId } } : {}),
    }
  }

  private reviews(filters: PerformanceAnalyticsFilters) {
    return this.prisma.performanceReview.findMany({
      where: this.buildWhere(filters),
      select: ANALYTICS_SELECT,
    })
  }

  async ratingScale() {
    return this.prisma.performanceRatingScale.findMany({ where: { isActive: true }, orderBy: { rank: "desc" } })
  }

  /** The Bell Curve Distribution Chart's data — actual count/percentage per
   *  rank, plus each rank's HR-configured `expectedPercentage`
   *  (PerformanceRatingScale.expectedPercentage) so the client can overlay
   *  "expected" vs "actual" as two series on the same chart. */
  async distribution(filters: PerformanceAnalyticsFilters) {
    const [reviews, scale] = await Promise.all([this.reviews(filters), this.ratingScale()])
    const labelByRank = new Map(scale.map((entry) => [entry.rank, entry.label]))
    const expectedByRank = new Map(scale.map((entry) => [entry.rank, entry.expectedPercentage]))

    const counts = new Map<number, number>()
    for (const review of reviews) {
      if (review.overallRating === null) continue
      counts.set(review.overallRating, (counts.get(review.overallRating) ?? 0) + 1)
    }
    const total = reviews.filter((r) => r.overallRating !== null).length

    return [5, 4, 3, 2, 1].map((rank) => {
      const count = counts.get(rank) ?? 0
      return {
        rank,
        label: labelByRank.get(rank) ?? `Rating ${rank}`,
        count,
        actualPercentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
        expectedPercentage: expectedByRank.get(rank) ?? null,
      }
    })
  }

  private average(values: number[]) {
    if (values.length === 0) return 0
    return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100
  }

  /** Population standard deviation of a department's ratings — how spread
   *  out performance is, not just its average. A department with the same
   *  average rating as another but a much higher stdDev has a wider gap
   *  between its best and worst performers (inconsistent management/
   *  calibration is a common read on this), which the average alone hides. */
  private stdDev(values: number[]) {
    if (values.length === 0) return 0
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
    return Math.round(Math.sqrt(variance) * 100) / 100
  }

  async byDepartment(filters: PerformanceAnalyticsFilters) {
    const reviews = await this.reviews(filters)
    const groups = new Map<string, { departmentId: string; departmentName: string; ratings: number[] }>()

    for (const review of reviews) {
      if (review.overallRating === null) continue
      const key = review.department?.id ?? "unassigned"
      const entry = groups.get(key) ?? {
        departmentId: key,
        departmentName: review.department?.name ?? "Unassigned",
        ratings: [],
      }
      entry.ratings.push(review.overallRating)
      groups.set(key, entry)
    }

    return Array.from(groups.values())
      .map((g) => ({
        departmentId: g.departmentId,
        departmentName: g.departmentName,
        averageRating: this.average(g.ratings),
        ratingStdDev: this.stdDev(g.ratings),
        reviews: g.ratings.length,
      }))
      .sort((a, b) => b.averageRating - a.averageRating)
  }

  async byFunction(filters: PerformanceAnalyticsFilters) {
    const reviews = await this.reviews(filters)
    const groups = new Map<string, { functionId: string; functionName: string; ratings: number[] }>()

    for (const review of reviews) {
      if (review.overallRating === null || !review.department?.function) continue
      const key = review.department.function.id
      const entry = groups.get(key) ?? { functionId: key, functionName: review.department.function.name, ratings: [] }
      entry.ratings.push(review.overallRating)
      groups.set(key, entry)
    }

    return Array.from(groups.values())
      .map((g) => ({ functionId: g.functionId, functionName: g.functionName, averageRating: this.average(g.ratings), reviews: g.ratings.length }))
      .sort((a, b) => b.averageRating - a.averageRating)
  }

  async byUnit(filters: PerformanceAnalyticsFilters) {
    const reviews = await this.reviews(filters)
    const groups = new Map<string, { unitId: string; unitName: string; ratings: number[] }>()

    for (const review of reviews) {
      if (review.overallRating === null || !review.unit) continue
      const key = review.unit.id
      const entry = groups.get(key) ?? { unitId: key, unitName: review.unit.name, ratings: [] }
      entry.ratings.push(review.overallRating)
      groups.set(key, entry)
    }

    return Array.from(groups.values())
      .map((g) => ({ unitId: g.unitId, unitName: g.unitName, averageRating: this.average(g.ratings), reviews: g.ratings.length }))
      .sort((a, b) => b.averageRating - a.averageRating)
  }

  async byBranch(filters: PerformanceAnalyticsFilters) {
    const reviews = await this.reviews(filters)
    const groups = new Map<string, { branchId: string; branchName: string; ratings: number[] }>()

    for (const review of reviews) {
      if (review.overallRating === null) continue
      const key = review.branch?.id ?? "unassigned"
      const entry = groups.get(key) ?? { branchId: key, branchName: review.branch?.name ?? "Unassigned", ratings: [] }
      entry.ratings.push(review.overallRating)
      groups.set(key, entry)
    }

    return Array.from(groups.values())
      .map((g) => ({ branchId: g.branchId, branchName: g.branchName, averageRating: this.average(g.ratings), reviews: g.ratings.length }))
      .sort((a, b) => b.averageRating - a.averageRating)
  }

  async byPositionLevel(filters: PerformanceAnalyticsFilters) {
    const reviews = await this.reviews(filters)
    const groups = new Map<string, { levelId: string; levelName: string; ratings: number[] }>()

    for (const review of reviews) {
      if (review.overallRating === null || !review.level) continue
      const key = review.level.id
      const entry = groups.get(key) ?? { levelId: key, levelName: review.level.name, ratings: [] }
      entry.ratings.push(review.overallRating)
      groups.set(key, entry)
    }

    return Array.from(groups.values())
      .map((g) => ({ levelId: g.levelId, levelName: g.levelName, averageRating: this.average(g.ratings), reviews: g.ratings.length }))
      .sort((a, b) => b.averageRating - a.averageRating)
  }

  async byBand(filters: PerformanceAnalyticsFilters) {
    const reviews = await this.reviews(filters)
    const groups = new Map<string, { bandId: string; bandName: string; ratings: number[] }>()

    for (const review of reviews) {
      if (review.overallRating === null || !review.band) continue
      const key = review.band.id
      const entry = groups.get(key) ?? { bandId: key, bandName: review.band.name, ratings: [] }
      entry.ratings.push(review.overallRating)
      groups.set(key, entry)
    }

    return Array.from(groups.values())
      .map((g) => ({ bandId: g.bandId, bandName: g.bandName, averageRating: this.average(g.ratings), reviews: g.ratings.length }))
      .sort((a, b) => b.averageRating - a.averageRating)
  }

  async byGender(filters: PerformanceAnalyticsFilters) {
    const reviews = await this.reviews(filters)
    const groups = new Map<string, number[]>()

    for (const review of reviews) {
      if (review.overallRating === null || !review.gender) continue
      const key = review.gender
      groups.set(key, [...(groups.get(key) ?? []), review.overallRating])
    }

    return Array.from(groups.entries()).map(([gender, ratings]) => ({
      gender,
      averageRating: this.average(ratings),
      reviews: ratings.length,
    }))
  }

  async byContractType(filters: PerformanceAnalyticsFilters) {
    const reviews = await this.reviews(filters)
    const groups = new Map<string, number[]>()

    for (const review of reviews) {
      if (review.overallRating === null || !review.contractType) continue
      const key = review.contractType
      groups.set(key, [...(groups.get(key) ?? []), review.overallRating])
    }

    return Array.from(groups.entries()).map(([contractType, ratings]) => ({
      contractType,
      averageRating: this.average(ratings),
      reviews: ratings.length,
    }))
  }

  /** Yearly trend, split by Mid-Year vs Annual, plus an overall average per year. */
  async trends(filters: PerformanceAnalyticsFilters) {
    const reviews = await this.reviews(filters)
    const byYear = new Map<number, { midYear: number[]; annual: number[] }>()

    for (const review of reviews) {
      if (review.overallRating === null) continue
      const year = review.period.year
      const entry = byYear.get(year) ?? { midYear: [], annual: [] }
      if (review.reviewType === "MID_YEAR") entry.midYear.push(review.overallRating)
      else entry.annual.push(review.overallRating)
      byYear.set(year, entry)
    }

    return Array.from(byYear.entries())
      .map(([year, { midYear, annual }]) => ({
        year,
        midYearAverage: this.average(midYear),
        annualAverage: this.average(annual),
        overallAverage: this.average([...midYear, ...annual]),
      }))
      .sort((a, b) => a.year - b.year)
  }

  /** One point per (employee, year) — the "performance progression" line for an individual, or averaged for a department trend. */
  async employeeProgression(employeeId: string) {
    const reviews = await this.prisma.performanceReview.findMany({
      where: { employeeId, overallRating: { not: null }, status: { not: "DRAFT" } },
      select: {
        overallRating: true,
        reviewType: true,
        period: { select: { year: true, name: true } },
      },
      orderBy: [{ period: { year: "asc" } }, { reviewType: "asc" }],
    })

    return reviews.map((r) => ({
      year: r.period.year,
      periodName: r.period.name,
      reviewType: r.reviewType,
      rating: r.overallRating,
    }))
  }

  async topPerformers(filters: PerformanceAnalyticsFilters, limit = 10) {
    const reviews = await this.reviews(filters)

    return reviews
      .filter((r) => r.overallRating !== null)
      .sort((a, b) => (b.overallRating ?? 0) - (a.overallRating ?? 0))
      .slice(0, limit)
      .map((r) => ({
        reviewId: r.id,
        employeeId: r.employee.employeeNumber,
        employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
        employeeNumber: r.employee.employeeNumber,
        departmentName: r.department?.name ?? "Unassigned",
        branchName: r.branch?.name ?? "Unassigned",
        rating: r.overallRating,
        reviewType: r.reviewType,
        periodName: r.period.name,
      }))
  }

  /** Ratings of 1 (Unsatisfactory) or 2 (Meets Some Expectations) — the follow-up/development-planning queue. */
  async needsImprovement(filters: PerformanceAnalyticsFilters) {
    const reviews = await this.reviews(filters)

    return reviews
      .filter((r) => r.overallRating !== null && r.overallRating <= 2)
      .sort((a, b) => (a.overallRating ?? 0) - (b.overallRating ?? 0))
      .map((r) => ({
        reviewId: r.id,
        employeeId: r.employee.employeeNumber,
        employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
        employeeNumber: r.employee.employeeNumber,
        departmentName: r.department?.name ?? "Unassigned",
        branchName: r.branch?.name ?? "Unassigned",
        reviewerName: r.reviewer ? `${r.reviewer.firstName} ${r.reviewer.lastName}` : "Unassigned",
        rating: r.overallRating,
        reviewType: r.reviewType,
        periodName: r.period.name,
      }))
  }

  /** Rating Distribution Heat Map — one row per department/branch/band/level
   *  with a count per rank 1-5, so the client can render a dimension x
   *  rank grid shaded by concentration. */
  async distributionHeatMap(filters: PerformanceAnalyticsFilters, dimension: "department" | "branch" | "band" | "level" = "department") {
    const reviews = await this.reviews(filters)
    const groups = new Map<string, { key: string; label: string; counts: Record<number, number> }>()

    for (const review of reviews) {
      if (review.overallRating === null) continue
      const dim =
        dimension === "department" ? review.department : dimension === "branch" ? review.branch : dimension === "band" ? review.band : review.level
      if (!dim) continue
      const entry = groups.get(dim.id) ?? { key: dim.id, label: dim.name, counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
      entry.counts[review.overallRating] = (entry.counts[review.overallRating] ?? 0) + 1
      groups.set(dim.id, entry)
    }

    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label))
  }

  /** Per-employee rollup (rating history summary) shared by
   *  promotionReadiness() and highPotential() below — not exposed as its
   *  own route. */
  private async employeeRatingRollups(filters: PerformanceAnalyticsFilters) {
    const reviews = await this.reviews(filters)

    const byEmployee = new Map<
      string,
      {
        employeeId: string
        employeeName: string
        departmentName: string
        bandName: string | null
        levelName: string | null
        ratings: { rating: number; periodYear: number | null }[]
      }
    >()

    for (const review of reviews) {
      if (review.overallRating === null) continue
      const key = review.employee.employeeNumber
      const entry = byEmployee.get(key) ?? {
        employeeId: key,
        employeeName: `${review.employee.firstName} ${review.employee.lastName}`,
        departmentName: review.department?.name ?? "Unassigned",
        bandName: review.band?.name ?? null,
        levelName: review.level?.name ?? null,
        ratings: [],
      }
      entry.ratings.push({ rating: review.overallRating, periodYear: review.period?.year ?? null })
      byEmployee.set(key, entry)
    }

    return Array.from(byEmployee.values()).map((entry) => {
      const sorted = [...entry.ratings].sort((a, b) => (a.periodYear ?? 0) - (b.periodYear ?? 0))
      const latestRating = sorted[sorted.length - 1]?.rating ?? null
      const averageRating = this.average(sorted.map((r) => r.rating))
      const firstHalf = sorted.slice(0, Math.ceil(sorted.length / 2))
      const secondHalf = sorted.slice(Math.ceil(sorted.length / 2))
      const firstHalfAvg = this.average(firstHalf.map((r) => r.rating))
      const secondHalfAvg = this.average(secondHalf.map((r) => r.rating))
      const trend: "improving" | "stable" | "declining" =
        sorted.length < 2 ? "stable" : secondHalfAvg > firstHalfAvg ? "improving" : secondHalfAvg < firstHalfAvg ? "declining" : "stable"

      return {
        employeeId: entry.employeeId,
        employeeName: entry.employeeName,
        departmentName: entry.departmentName,
        bandName: entry.bandName,
        levelName: entry.levelName,
        reviewCount: sorted.length,
        latestRating,
        averageRating,
        trend,
      }
    })
  }

  /** HR's four promotion-eligibility criteria, all required:
   *   1. Latest performance rating between 3 and 5.
   *   2. At least 3 years of continuous tenure in the employee's current
   *      department — walked back through PositionHistory (joined to
   *      Position for its departmentId) from most recent, stopping at the
   *      first row whose position sits in a different department; an
   *      employee with no PositionHistory at all falls back to their
   *      company employmentStartDate (never having changed departments).
   *   3. At least 18 months since their last internal PROMOTION or
   *      TRANSFER, if they've ever had one — an employee who's never moved
   *      internally has nothing to cool down from, so this passes by
   *      default in that case.
   *   4. Never received a disciplinary sanction, at any time.
   * Unlike highPotential() below, this intentionally ignores reviewCount/
   * trend — HR's brief is about a rating band plus tenure/conduct, not
   * trajectory. */
  async promotionReadiness(filters: PerformanceAnalyticsFilters) {
    const rollups = await this.employeeRatingRollups(filters)
    const candidates = rollups.filter((r) => r.latestRating !== null && r.latestRating >= 3 && r.latestRating <= 5)
    if (candidates.length === 0) return []

    const employeeIds = candidates.map((c) => c.employeeId)

    const [employees, historyRows, sanctioned] = await Promise.all([
      this.prisma.employee.findMany({
        where: { employeeNumber: { in: employeeIds } },
        select: { employeeNumber: true, employmentStartDate: true, position: { select: { departmentId: true } } },
      }),
      this.prisma.positionHistory.findMany({
        where: { employeeId: { in: employeeIds } },
        orderBy: { effectiveFrom: "desc" },
        select: { employeeId: true, changeType: true, effectiveFrom: true, position: { select: { departmentId: true } } },
      }),
      this.prisma.sanction.findMany({
        where: { employeeId: { in: employeeIds } },
        select: { employeeId: true },
        distinct: ["employeeId"],
      }),
    ])

    const employeeById = new Map(employees.map((e) => [e.employeeNumber, e]))
    const historyByEmployee = new Map<string, typeof historyRows>()
    for (const row of historyRows) {
      const list = historyByEmployee.get(row.employeeId) ?? []
      list.push(row)
      historyByEmployee.set(row.employeeId, list)
    }
    const sanctionedIds = new Set(sanctioned.map((s) => s.employeeId))

    const now = Date.now()
    const THREE_YEARS_MS = 3 * 365.25 * 24 * 60 * 60 * 1000
    const EIGHTEEN_MONTHS_MS = 18 * 30.44 * 24 * 60 * 60 * 1000

    return candidates
      .filter((c) => {
        if (sanctionedIds.has(c.employeeId)) return false

        const employee = employeeById.get(c.employeeId)
        const currentDepartmentId = employee?.position?.departmentId ?? null
        // Rows are already sorted most-recent-first (orderBy effectiveFrom desc above).
        const history = historyByEmployee.get(c.employeeId) ?? []

        let departmentStart: Date | null = null
        if (history.length === 0) {
          departmentStart = employee?.employmentStartDate ?? null
        } else if (currentDepartmentId) {
          for (const row of history) {
            if (row.position.departmentId !== currentDepartmentId) break
            departmentStart = row.effectiveFrom
          }
        }
        if (!departmentStart || now - departmentStart.getTime() < THREE_YEARS_MS) return false

        const lastInternalMove = history.find((row) => row.changeType === "PROMOTION" || row.changeType === "TRANSFER")
        if (lastInternalMove && now - lastInternalMove.effectiveFrom.getTime() < EIGHTEEN_MONTHS_MS) return false

        return true
      })
      .sort((a, b) => (b.latestRating ?? 0) - (a.latestRating ?? 0))
  }

  /** Employees whose rating history stands out as exceptional — average
   *  rating >= 4.5, or a perfect latest rating with an improving/stable
   *  trend. Same "simple, transparent heuristic" caveat as
   *  promotionReadiness() above. */
  async highPotential(filters: PerformanceAnalyticsFilters) {
    const rollups = await this.employeeRatingRollups(filters)
    return rollups
      .filter((r) => r.averageRating >= 4.5 || (r.latestRating === 5 && r.trend !== "declining"))
      .sort((a, b) => b.averageRating - a.averageRating)
  }
}
