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
}

const ANALYTICS_SELECT = {
  id: true,
  overallRating: true,
  reviewType: true,
  status: true,
  employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
  reviewer: { select: { firstName: true, lastName: true } },
  department: { select: { id: true, name: true } },
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

  async distribution(filters: PerformanceAnalyticsFilters) {
    const [reviews, scale] = await Promise.all([this.reviews(filters), this.ratingScale()])
    const labelByRank = new Map(scale.map((entry) => [entry.rank, entry.label]))

    const counts = new Map<number, number>()
    for (const review of reviews) {
      if (review.overallRating === null) continue
      counts.set(review.overallRating, (counts.get(review.overallRating) ?? 0) + 1)
    }

    return [5, 4, 3, 2, 1].map((rank) => ({
      rank,
      label: labelByRank.get(rank) ?? `Rating ${rank}`,
      count: counts.get(rank) ?? 0,
    }))
  }

  private average(values: number[]) {
    if (values.length === 0) return 0
    return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100
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
      .map((g) => ({ departmentId: g.departmentId, departmentName: g.departmentName, averageRating: this.average(g.ratings), reviews: g.ratings.length }))
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
}
