import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { fetchBands } from "@/lib/api/bands"
import { fetchBranches } from "@/lib/api/branches"
import { fetchDepartments } from "@/lib/api/departments"
import { fetchPositionLevels } from "@/lib/api/positions"
import {
  fetchByBand,
  fetchByBranch,
  fetchByContractType,
  fetchByDepartment,
  fetchByGender,
  fetchByPositionLevel,
  fetchDistribution,
  fetchNeedsImprovement,
  fetchReviewPeriods,
  fetchTopPerformers,
  fetchTrends,
  type AnalyticsFilters,
} from "@/lib/api/performance"

import { PerformanceTabs } from "./performance-tabs"

interface SearchParams {
  periodId?: string
  reviewType?: string
  departmentId?: string
  branchId?: string
  levelId?: string
  bandId?: string
}

function HorizontalBarList({
  rows,
  suffix = "",
}: {
  rows: Array<{ label: string; value: number; sub?: string }>
  suffix?: string
}) {
  const max = Math.max(1, ...rows.map((row) => row.value))

  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No data for this selection.</p>
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3 text-sm">
          <div className="w-36 shrink-0 truncate text-muted-foreground" title={row.label}>
            {row.label}
          </div>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
            />
          </div>
          <div className="w-20 shrink-0 text-right font-medium text-foreground">
            {row.value}
            {suffix}
            {row.sub ? <span className="text-muted-foreground"> {row.sub}</span> : null}
          </div>
        </div>
      ))}
    </div>
  )
}

const RATING_COLORS: Record<number, string> = {
  5: "bg-emerald-500",
  4: "bg-emerald-400",
  3: "bg-amber-400",
  2: "bg-orange-500",
  1: "bg-destructive",
}

export default async function AdminPerformanceDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const filters = await searchParams
  const analyticsFilters: AnalyticsFilters = {
    periodId: filters.periodId,
    reviewType: filters.reviewType as AnalyticsFilters["reviewType"],
    departmentId: filters.departmentId,
    branchId: filters.branchId,
    levelId: filters.levelId,
    bandId: filters.bandId,
  }

  const [
    periodsResult,
    departmentsResult,
    branchesResult,
    levelsResult,
    bandsResult,
    distributionResult,
    byDepartmentResult,
    byBranchResult,
    byLevelResult,
    byBandResult,
    byGenderResult,
    byContractTypeResult,
    trendsResult,
    topPerformersResult,
    needsImprovementResult,
  ] = await Promise.all([
    fetchReviewPeriods(),
    fetchDepartments(),
    fetchBranches(),
    fetchPositionLevels(),
    fetchBands(),
    fetchDistribution(analyticsFilters),
    fetchByDepartment(analyticsFilters),
    fetchByBranch(analyticsFilters),
    fetchByPositionLevel(analyticsFilters),
    fetchByBand(analyticsFilters),
    fetchByGender(analyticsFilters),
    fetchByContractType(analyticsFilters),
    fetchTrends(analyticsFilters),
    fetchTopPerformers(analyticsFilters, 10),
    fetchNeedsImprovement(analyticsFilters),
  ])

  const periods = periodsResult.ok ? periodsResult.data : []
  const departments = departmentsResult.ok ? departmentsResult.data : []
  const branches = branchesResult.ok ? branchesResult.data : []
  const levels = levelsResult.ok ? levelsResult.data : []
  const bands = bandsResult.ok ? bandsResult.data : []
  const distribution = distributionResult.ok ? distributionResult.data : []
  const totalRated = distribution.reduce((sum, entry) => sum + entry.count, 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Performance Management</h1>
        <p className="text-sm text-muted-foreground">
          Executive insights into ratings, review progress, and workforce performance trends.
        </p>
      </div>

      <PerformanceTabs />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Review period</label>
              <Select name="periodId" defaultValue={filters.periodId ?? ""} className="w-40">
                <option value="">All periods</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Review type</label>
              <Select name="reviewType" defaultValue={filters.reviewType ?? ""} className="w-40">
                <option value="">Mid-Year &amp; Annual</option>
                <option value="MID_YEAR">Mid-Year</option>
                <option value="ANNUAL">Annual</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Department</label>
              <Select name="departmentId" defaultValue={filters.departmentId ?? ""} className="w-40">
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Branch</label>
              <Select name="branchId" defaultValue={filters.branchId ?? ""} className="w-40">
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Position level</label>
              <Select name="levelId" defaultValue={filters.levelId ?? ""} className="w-40">
                <option value="">All levels</option>
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Band</label>
              <Select name="bandId" defaultValue={filters.bandId ?? ""} className="w-40">
                <option value="">All bands</option>
                {bands.map((band) => (
                  <option key={band.id} value={band.id}>
                    {band.name}
                  </option>
                ))}
              </Select>
            </div>
            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overall performance distribution</CardTitle>
          <CardDescription>{totalRated} rated review(s) in this selection.</CardDescription>
        </CardHeader>
        <CardContent>
          {totalRated === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No rated reviews yet for this selection.</p>
          ) : (
            <div className="flex h-8 w-full overflow-hidden rounded-full">
              {distribution.map((entry) =>
                entry.count > 0 ? (
                  <div
                    key={entry.rank}
                    className={`${RATING_COLORS[entry.rank]} flex items-center justify-center text-xs font-medium text-white`}
                    style={{ width: `${(entry.count / totalRated) * 100}%` }}
                    title={`${entry.label}: ${entry.count}`}
                  >
                    {entry.count}
                  </div>
                ) : null
              )}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            {distribution.map((entry) => (
              <span key={entry.rank} className="flex items-center gap-1.5">
                <span className={`size-2.5 rounded-full ${RATING_COLORS[entry.rank]}`} />
                {entry.rank} · {entry.label} ({entry.count})
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Department performance</CardTitle>
            <CardDescription>Average rating (out of 5).</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarList
              rows={
                byDepartmentResult.ok
                  ? byDepartmentResult.data.map((d) => ({
                      label: d.departmentName,
                      value: d.averageRating,
                      sub: `(${d.reviews})`,
                    }))
                  : []
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Branch performance</CardTitle>
            <CardDescription>Average rating (out of 5).</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarList
              rows={
                byBranchResult.ok
                  ? byBranchResult.data.map((d) => ({
                      label: d.branchName,
                      value: d.averageRating,
                      sub: `(${d.reviews})`,
                    }))
                  : []
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Position level performance</CardTitle>
            <CardDescription>Average rating (out of 5).</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarList
              rows={
                byLevelResult.ok
                  ? byLevelResult.data.map((d) => ({
                      label: d.levelName,
                      value: d.averageRating,
                      sub: `(${d.reviews})`,
                    }))
                  : []
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Band performance</CardTitle>
            <CardDescription>Average rating (out of 5).</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarList
              rows={
                byBandResult.ok
                  ? byBandResult.data.map((d) => ({ label: d.bandName, value: d.averageRating, sub: `(${d.reviews})` }))
                  : []
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gender analysis</CardTitle>
            <CardDescription>Average rating (out of 5).</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarList
              rows={
                byGenderResult.ok
                  ? byGenderResult.data.map((d) => ({
                      label: d.gender === "MALE" ? "Male" : "Female",
                      value: d.averageRating,
                      sub: `(${d.reviews})`,
                    }))
                  : []
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contract type analysis</CardTitle>
            <CardDescription>Average rating (out of 5).</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarList
              rows={
                byContractTypeResult.ok
                  ? byContractTypeResult.data.map((d) => ({
                      label: d.contractType.replaceAll("_", " "),
                      value: d.averageRating,
                      sub: `(${d.reviews})`,
                    }))
                  : []
              }
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance trends</CardTitle>
          <CardDescription>Mid-Year vs Annual average rating by year.</CardDescription>
        </CardHeader>
        <CardContent>
          {!trendsResult.ok || trendsResult.data.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Not enough data yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {trendsResult.data.map((point) => (
                <div key={point.year} className="flex items-center gap-4 text-sm">
                  <span className="w-14 shrink-0 font-medium text-foreground">{point.year}</span>
                  <div className="flex flex-1 items-center gap-2">
                    <span className="w-24 shrink-0 text-xs text-muted-foreground">Mid-Year</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(2, (point.midYearAverage / 5) * 100)}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-medium">{point.midYearAverage || "—"}</span>
                  </div>
                  <div className="flex flex-1 items-center gap-2">
                    <span className="w-24 shrink-0 text-xs text-muted-foreground">Annual</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.max(2, (point.annualAverage / 5) * 100)}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-medium">{point.annualAverage || "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top performers</CardTitle>
            <CardDescription>Highest-rated employees in this selection.</CardDescription>
          </CardHeader>
          <CardContent>
            {!topPerformersResult.ok || topPerformersResult.data.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No data.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {topPerformersResult.data.map((entry) => (
                  <li key={entry.reviewId} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{entry.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.departmentName} · {entry.branchName}
                      </p>
                    </div>
                    <span className="font-medium text-emerald-600">{entry.rating}/5</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employees requiring improvement</CardTitle>
            <CardDescription>Ratings of 1 (Unsatisfactory) or 2 (Meets Some Expectations).</CardDescription>
          </CardHeader>
          <CardContent>
            {!needsImprovementResult.ok || needsImprovementResult.data.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No one flagged right now.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {needsImprovementResult.data.map((entry) => (
                  <li key={entry.reviewId} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{entry.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.departmentName} · Reviewer: {entry.reviewerName}
                      </p>
                    </div>
                    <span className="font-medium text-destructive">{entry.rating}/5</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
