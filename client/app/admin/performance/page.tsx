import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { fetchBands } from "@/lib/api/bands"
import { fetchBranches } from "@/lib/api/branches"
import { fetchDepartments, fetchFunctions } from "@/lib/api/departments"
import { fetchPositionLevels } from "@/lib/api/positions"
import {
  fetchByBand,
  fetchByBranch,
  fetchByContractType,
  fetchByDepartment,
  fetchByFunction,
  fetchByGender,
  fetchByPositionLevel,
  fetchDistribution,
  fetchHeatMap,
  fetchHighPotential,
  fetchNeedsImprovement,
  fetchPromotionReadiness,
  fetchReviewPeriods,
  fetchTopPerformers,
  fetchTrends,
  type AnalyticsFilters,
} from "@/lib/api/performance"

import { getSession } from "@/lib/get-session"

import { ImportManager } from "../imports/import-manager"
import { PerformanceTabs } from "./performance-tabs"

interface SearchParams {
  periodId?: string
  year?: string
  reviewType?: string
  departmentId?: string
  functionId?: string
  branchId?: string
  levelId?: string
  bandId?: string
  contractType?: string
  gender?: string
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
    year: filters.year ? Number(filters.year) : undefined,
    reviewType: filters.reviewType as AnalyticsFilters["reviewType"],
    departmentId: filters.departmentId,
    functionId: filters.functionId,
    branchId: filters.branchId,
    levelId: filters.levelId,
    bandId: filters.bandId,
    contractType: filters.contractType,
    gender: filters.gender,
  }

  const [
    periodsResult,
    departmentsResult,
    functionsResult,
    branchesResult,
    levelsResult,
    bandsResult,
    distributionResult,
    byDepartmentResult,
    byFunctionResult,
    byBranchResult,
    byLevelResult,
    byBandResult,
    byGenderResult,
    byContractTypeResult,
    trendsResult,
    topPerformersResult,
    needsImprovementResult,
    heatMapResult,
    promotionReadinessResult,
    highPotentialResult,
  ] = await Promise.all([
    fetchReviewPeriods(),
    fetchDepartments(),
    fetchFunctions(),
    fetchBranches(),
    fetchPositionLevels(),
    fetchBands(),
    fetchDistribution(analyticsFilters),
    fetchByDepartment(analyticsFilters),
    fetchByFunction(analyticsFilters),
    fetchByBranch(analyticsFilters),
    fetchByPositionLevel(analyticsFilters),
    fetchByBand(analyticsFilters),
    fetchByGender(analyticsFilters),
    fetchByContractType(analyticsFilters),
    fetchTrends(analyticsFilters),
    fetchTopPerformers(analyticsFilters, 10),
    fetchNeedsImprovement(analyticsFilters),
    fetchHeatMap(analyticsFilters, "department"),
    fetchPromotionReadiness(analyticsFilters),
    fetchHighPotential(analyticsFilters),
  ])

  const periods = periodsResult.ok ? periodsResult.data : []
  const departments = departmentsResult.ok ? departmentsResult.data : []
  const functions = functionsResult.ok ? functionsResult.data : []
  const branches = branchesResult.ok ? branchesResult.data : []
  const levels = levelsResult.ok ? levelsResult.data : []
  const bands = bandsResult.ok ? bandsResult.data : []
  const distribution = distributionResult.ok ? distributionResult.data : []
  const totalRated = distribution.reduce((sum, entry) => sum + entry.count, 0)
  const byDepartment = byDepartmentResult.ok ? byDepartmentResult.data : []
  const topDepartments = byDepartment.slice(0, 3)
  const lowestDepartments = [...byDepartment].sort((a, b) => a.averageRating - b.averageRating).slice(0, 3)
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Performance Management</h1>
          <p className="text-sm text-muted-foreground">
            Executive insights into ratings, review progress, and workforce performance trends.
          </p>
        </div>
        <ImportManager moduleKey="performance" moduleLabel="Performance" actingEmployeeId={actingEmployeeId} />
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
              <label className="text-xs text-muted-foreground">Year</label>
              <input
                type="number"
                name="year"
                defaultValue={filters.year ?? ""}
                placeholder="All years"
                className="h-9 w-24 rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-none"
              />
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
              <label className="text-xs text-muted-foreground">Function</label>
              <Select name="functionId" defaultValue={filters.functionId ?? ""} className="w-40">
                <option value="">All functions</option>
                {functions.map((fn) => (
                  <option key={fn.id} value={fn.id}>
                    {fn.name}
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
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Contract type</label>
              <Select name="contractType" defaultValue={filters.contractType ?? ""} className="w-40">
                <option value="">All contract types</option>
                <option value="PERMANENT">Permanent</option>
                <option value="TEMPORARY">Temporary</option>
                <option value="GRADUATE_TRAINEE">Graduate Trainee</option>
                <option value="INTERN">Intern</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Gender</label>
              <Select name="gender" defaultValue={filters.gender ?? ""} className="w-32">
                <option value="">All</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
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

      <Card>
        <CardHeader>
          <CardTitle>Bell curve — expected vs actual</CardTitle>
          <CardDescription>Actual rating distribution (%) against the organization&apos;s expected curve, configured per rank in Rating Scale settings.</CardDescription>
        </CardHeader>
        <CardContent>
          {distribution.every((entry) => entry.expectedPercentage === null) ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No expected percentages configured yet — set them on each rank in Rating Scale settings to see the overlay.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {distribution.map((entry) => (
                <div key={entry.rank} className="flex items-center gap-3 text-sm">
                  <div className="w-40 shrink-0 truncate text-muted-foreground">
                    {entry.rank} · {entry.label}
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-[0.65rem] text-muted-foreground">Actual</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full ${RATING_COLORS[entry.rank]}`} style={{ width: `${Math.max(2, entry.actualPercentage)}%` }} />
                      </div>
                      <span className="w-12 shrink-0 text-right text-xs font-medium">{entry.actualPercentage}%</span>
                    </div>
                    {entry.expectedPercentage !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="w-14 shrink-0 text-[0.65rem] text-muted-foreground">Expected</span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-foreground/30" style={{ width: `${Math.max(2, entry.expectedPercentage)}%` }} />
                        </div>
                        <span className="w-12 shrink-0 text-right text-xs font-medium">{entry.expectedPercentage}%</span>
                      </div>
                    ) : null}
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
            <CardTitle>Function performance</CardTitle>
            <CardDescription>Average rating (out of 5).</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarList
              rows={
                byFunctionResult.ok
                  ? byFunctionResult.data.map((d) => ({
                      label: d.functionName,
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top performing departments</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList rows={topDepartments.map((d) => ({ label: d.departmentName, value: d.averageRating, sub: `(${d.reviews})` }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lowest performing departments</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList rows={lowestDepartments.map((d) => ({ label: d.departmentName, value: d.averageRating, sub: `(${d.reviews})` }))} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rating distribution heat map — by department</CardTitle>
          <CardDescription>Count of reviews at each rank, shaded by concentration.</CardDescription>
        </CardHeader>
        <CardContent>
          {!heatMapResult.ok || heatMapResult.data.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No data for this selection.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Department</th>
                    {[5, 4, 3, 2, 1].map((rank) => (
                      <th key={rank} className="px-2 py-1 text-center font-medium">
                        {rank}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatMapResult.data.map((row) => {
                    const rowMax = Math.max(1, ...Object.values(row.counts))
                    return (
                      <tr key={row.key} className="border-t border-border">
                        <td className="py-1.5 pr-3 font-medium text-foreground">{row.label}</td>
                        {[5, 4, 3, 2, 1].map((rank) => {
                          const count = row.counts[rank] ?? 0
                          const intensity = count === 0 ? 0 : 0.15 + (count / rowMax) * 0.65
                          return (
                            <td key={rank} className="px-2 py-1.5 text-center text-xs">
                              <span
                                className="inline-flex size-7 items-center justify-center rounded"
                                style={{ backgroundColor: `rgba(16, 185, 129, ${intensity})` }}
                              >
                                {count || ""}
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Promotion readiness</CardTitle>
            <CardDescription>Consistently strong, non-declining rating history (avg &amp; latest ≥ 4, 2+ reviews).</CardDescription>
          </CardHeader>
          <CardContent>
            {!promotionReadinessResult.ok || promotionReadinessResult.data.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No candidates for this selection.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {promotionReadinessResult.data.map((candidate) => (
                  <li key={candidate.employeeId} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{candidate.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {candidate.departmentName}
                        {candidate.bandName ? ` · ${candidate.bandName}` : ""} · {candidate.trend}
                      </p>
                    </div>
                    <span className="font-medium text-emerald-600">{candidate.averageRating}/5</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>High-potential employees</CardTitle>
            <CardDescription>Average rating ≥ 4.5, or a perfect latest rating with a non-declining trend.</CardDescription>
          </CardHeader>
          <CardContent>
            {!highPotentialResult.ok || highPotentialResult.data.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No candidates for this selection.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {highPotentialResult.data.map((candidate) => (
                  <li key={candidate.employeeId} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{candidate.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {candidate.departmentName}
                        {candidate.bandName ? ` · ${candidate.bandName}` : ""} · {candidate.trend}
                      </p>
                    </div>
                    <span className="font-medium text-emerald-600">{candidate.averageRating}/5</span>
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
