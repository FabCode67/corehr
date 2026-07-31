import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { fetchBands } from "@/lib/api/bands"
import { fetchBranches } from "@/lib/api/branches"
import { fetchDepartments, fetchFunctions, fetchUnits } from "@/lib/api/departments"
import { formatEnumLabel } from "@/lib/api/employees"
import {
  exportUrl,
  fetchAttritionRate,
  fetchAverageAge,
  fetchBandDistribution,
  fetchDemographics,
  fetchEmployeeDistribution,
  fetchEmployeeExperience,
  fetchExitSummary,
  fetchLearningAnalytics,
  fetchLeaveSummary,
  fetchLeaveUtilization,
  fetchOrgStructure,
  fetchPerformanceDistribution,
  fetchPositionFillRate,
  fetchRecruitmentAnalytics,
  fetchSavedViews,
  fetchTotalStaff,
  type HrAnalyticsFilters as HrFilters,
} from "@/lib/api/hr-analytics"
import { fetchPositionLevels, fetchPositions } from "@/lib/api/positions"
import { getSession } from "@/lib/get-session"

import { BarList } from "./bar-list"
import { AgeHistogramChart, BandDistributionChart, DepartmentDonutChart, ExitTrendChart, PerformanceBellCurveChart } from "./charts"
import { KpiCards } from "./kpi-cards"
import { SavedViewsPanel } from "./saved-views-panel"

type SearchParams = Record<string, string | undefined>

export default async function HrAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const filters: HrFilters = {
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
  const currentQuery = Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, string] => Boolean(entry[1])))

  const [
    functionsResult,
    departmentsResult,
    unitsResult,
    branchesResult,
    positionsResult,
    levelsResult,
    bandsResult,
    totalStaffResult,
    averageAgeResult,
    bandDistributionResult,
    attritionRateResult,
    positionFillRateResult,
    leaveUtilizationResult,
    employeeDistributionResult,
    exitSummaryResult,
    demographicsResult,
    orgStructureResult,
    employeeExperienceResult,
    performanceDistributionResult,
    leaveSummaryResult,
    recruitmentResult,
    learningResult,
    savedViewsResult,
  ] = await Promise.all([
    fetchFunctions(),
    fetchDepartments(),
    fetchUnits(),
    fetchBranches(),
    fetchPositions(),
    fetchPositionLevels(),
    fetchBands(),
    fetchTotalStaff(filters, actingEmployeeId),
    fetchAverageAge(filters, actingEmployeeId),
    fetchBandDistribution(filters, actingEmployeeId),
    fetchAttritionRate(filters, actingEmployeeId),
    fetchPositionFillRate(filters, actingEmployeeId),
    fetchLeaveUtilization(filters, actingEmployeeId),
    fetchEmployeeDistribution(filters, actingEmployeeId),
    fetchExitSummary(filters, actingEmployeeId),
    fetchDemographics(filters, actingEmployeeId),
    fetchOrgStructure(filters, actingEmployeeId),
    fetchEmployeeExperience(filters, actingEmployeeId),
    fetchPerformanceDistribution(filters, actingEmployeeId),
    fetchLeaveSummary(filters, actingEmployeeId),
    fetchRecruitmentAnalytics(actingEmployeeId),
    fetchLearningAnalytics(filters, actingEmployeeId),
    fetchSavedViews(actingEmployeeId),
  ])

  const functions = functionsResult.ok ? functionsResult.data : []
  const departments = departmentsResult.ok ? departmentsResult.data : []
  const units = unitsResult.ok ? unitsResult.data : []
  const branches = branchesResult.ok ? branchesResult.data : []
  const positions = positionsResult.ok ? positionsResult.data : []
  const levels = levelsResult.ok ? levelsResult.data : []
  const bands = bandsResult.ok ? bandsResult.data : []
  const savedViews = savedViewsResult.ok ? savedViewsResult.data : []

  const currentYear = new Date().getUTCFullYear()
  const yearOptions = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear, currentYear + 1]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">HR Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time workforce statistics, trends, and organizational insights.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(["xlsx", "csv", "pdf", "pptx"] as const).map((format) => (
            <a
              key={format}
              href={exportUrl(format, filters, actingEmployeeId)}
              className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-muted"
            >
              Export {format.toUpperCase()}
            </a>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Applies to every card, chart, and export below. Supports single-year, month, quarter, or an explicit date range.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Year</label>
              <Select name="year" defaultValue={raw.year ?? ""} className="w-24">
                <option value="">Any</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Quarter</label>
              <Select name="quarter" defaultValue={raw.quarter ?? ""} className="w-24">
                <option value="">Any</option>
                {[1, 2, 3, 4].map((q) => (
                  <option key={q} value={q}>
                    Q{q}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Month</label>
              <Select name="month" defaultValue={raw.month ?? ""} className="w-28">
                <option value="">Any</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(Date.UTC(2000, m - 1, 1)).toLocaleString("en-GB", { month: "long" })}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Function</label>
              <Select name="functionId" defaultValue={raw.functionId ?? ""} className="w-40">
                <option value="">All functions</option>
                {functions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Department</label>
              <Select name="departmentId" defaultValue={raw.departmentId ?? ""} className="w-40">
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Unit</label>
              <Select name="unitId" defaultValue={raw.unitId ?? ""} className="w-36">
                <option value="">All units</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Branch</label>
              <Select name="branchId" defaultValue={raw.branchId ?? ""} className="w-36">
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Position</label>
              <Select name="positionId" defaultValue={raw.positionId ?? ""} className="w-40">
                <option value="">All positions</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Position Level</label>
              <Select name="levelId" defaultValue={raw.levelId ?? ""} className="w-36">
                <option value="">All levels</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Band</label>
              <Select name="bandId" defaultValue={raw.bandId ?? ""} className="w-32">
                <option value="">All bands</option>
                {bands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Contract Type</label>
              <Select name="contractType" defaultValue={raw.contractType ?? ""} className="w-36">
                <option value="">All contract types</option>
                {["PERMANENT", "TEMPORARY", "GRADUATE_TRAINEE", "INTERN"].map((c) => (
                  <option key={c} value={c}>
                    {formatEnumLabel(c)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Gender</label>
              <Select name="gender" defaultValue={raw.gender ?? ""} className="w-28">
                <option value="">Any</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Employee Status</label>
              <Select name="employmentStatus" defaultValue={raw.employmentStatus ?? ""} className="w-32">
                <option value="">Any</option>
                <option value="ACTIVE">Active</option>
                <option value="EXIT">Exited</option>
              </Select>
            </div>
            <button type="submit" className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80">
              Apply
            </button>
            <a href="/admin/hr-analytics" className="h-9 rounded-lg border border-border px-3 text-sm font-medium text-foreground leading-9 hover:bg-muted">
              Reset
            </a>
          </form>

          <SavedViewsPanel views={savedViews} currentQuery={currentQuery} actingEmployeeId={actingEmployeeId} />
        </CardContent>
      </Card>

      {totalStaffResult.ok && averageAgeResult.ok && attritionRateResult.ok && positionFillRateResult.ok && leaveUtilizationResult.ok ? (
        <KpiCards
          totalStaff={totalStaffResult.data}
          averageAge={averageAgeResult.data}
          attritionRate={attritionRateResult.data}
          positionFillRate={positionFillRateResult.data}
          leaveUtilization={leaveUtilizationResult.data}
        />
      ) : (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>Some KPI cards failed to load. Try adjusting your filters or refreshing.</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Band Distribution</CardTitle>
            <CardDescription>Headcount across every band.</CardDescription>
          </CardHeader>
          <CardContent>{bandDistributionResult.ok ? <BandDistributionChart data={bandDistributionResult.data} /> : <p className="text-sm text-destructive">{bandDistributionResult.error}</p>}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employee Distribution by Department</CardTitle>
          </CardHeader>
          <CardContent>{employeeDistributionResult.ok ? <DepartmentDonutChart data={employeeDistributionResult.data} /> : <p className="text-sm text-destructive">{employeeDistributionResult.error}</p>}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Position Fill Rate by Department</CardTitle>
            <CardDescription>Identify departments with vacant positions.</CardDescription>
          </CardHeader>
          <CardContent>
            {positionFillRateResult.ok ? (
              <BarList rows={positionFillRateResult.data.byDepartment.map((d) => ({ label: d.name as string, value: d.fillRate as number, sub: `(${d.filled}/${d.total})` }))} />
            ) : (
              <p className="text-sm text-destructive">{positionFillRateResult.error}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Distribution</CardTitle>
            <CardDescription>Actual vs. expected rating curve.</CardDescription>
          </CardHeader>
          <CardContent>
            {performanceDistributionResult.ok ? <PerformanceBellCurveChart data={performanceDistributionResult.data} /> : <p className="text-sm text-destructive">{performanceDistributionResult.error}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exit Summary</CardTitle>
            <CardDescription>{exitSummaryResult.ok ? `${exitSummaryResult.data.totalExits} exits in the selected period.` : ""}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {exitSummaryResult.ok ? (
              <>
                <ExitTrendChart data={exitSummaryResult.data.trend} />
                <BarList rows={exitSummaryResult.data.byReason.map((r) => ({ label: r.label, value: r.count }))} />
              </>
            ) : (
              <p className="text-sm text-destructive">{exitSummaryResult.error}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employee Demographics</CardTitle>
            <CardDescription>Age, gender, and contract type.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {demographicsResult.ok ? (
              <>
                <AgeHistogramChart data={demographicsResult.data.ageHistogram} />
                <BarList rows={demographicsResult.data.genderDistribution.map((g) => ({ label: formatEnumLabel(g.label), value: g.count }))} />
                <BarList rows={demographicsResult.data.contractTypeDistribution.map((c) => ({ label: formatEnumLabel(c.label), value: c.count }))} />
              </>
            ) : (
              <p className="text-sm text-destructive">{demographicsResult.error}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave Summary</CardTitle>
            <CardDescription>By department and leave type.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {leaveSummaryResult.ok ? (
              <>
                <BarList rows={leaveSummaryResult.data.byDepartment.map((d) => ({ label: d.departmentName, value: d.days, sub: "days" }))} />
                <BarList rows={leaveSummaryResult.data.byType.map((t) => ({ label: t.leaveTypeName, value: t.days, sub: "days" }))} />
              </>
            ) : (
              <p className="text-sm text-destructive">{leaveSummaryResult.error}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recruitment Analytics</CardTitle>
            <CardDescription>Not affected by the org-dimension filters above — shows your own recruitment role scope.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recruitmentResult.ok ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Open Positions</p>
                    <p className="font-medium text-foreground">{recruitmentResult.data.overview.openRequisitions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Applications</p>
                    <p className="font-medium text-foreground">{recruitmentResult.data.overview.activeApplications}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Time to Hire</p>
                    <p className="font-medium text-foreground">{recruitmentResult.data.timeToHire.averageDays ?? "—"} days</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Success Rate</p>
                    <p className="font-medium text-foreground">{recruitmentResult.data.recruitmentSuccessRate ?? "—"}%</p>
                  </div>
                </div>
                <BarList rows={recruitmentResult.data.funnel.map((f) => ({ label: formatEnumLabel(f.status), value: f.count }))} />
              </>
            ) : (
              <p className="text-sm text-destructive">{recruitmentResult.error}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Learning &amp; Development</CardTitle>
            <CardDescription>Training completion, mandatory compliance, and AML.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {learningResult.ok ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Completion Rate</p>
                    <p className="font-medium text-foreground">{learningResult.data.trainingCompletionRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">AML Compliance</p>
                    <p className="font-medium text-foreground">{learningResult.data.amlCompletionRate === null ? "Not tracked" : `${learningResult.data.amlCompletionRate}%`}</p>
                  </div>
                </div>
                <BarList rows={learningResult.data.mandatoryTrainingCompliance.byDepartment.map((d) => ({ label: d.name, value: d.compliancePercent, sub: "%" }))} />
              </>
            ) : (
              <p className="text-sm text-destructive">{learningResult.error}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organizational Structure</CardTitle>
            <CardDescription>Managers vs. individual contributors, span of control.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {orgStructureResult.ok ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Managers</p>
                    <p className="font-medium text-foreground">{orgStructureResult.data.managersVsIndividualContributors.managers}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Individual Contributors</p>
                    <p className="font-medium text-foreground">{orgStructureResult.data.managersVsIndividualContributors.individualContributors}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg. Span of Control</p>
                    <p className="font-medium text-foreground">{orgStructureResult.data.averageSpanOfControl}</p>
                  </div>
                </div>
                <BarList rows={orgStructureResult.data.byFunction.map((f) => ({ label: f.label, value: f.count }))} />
              </>
            ) : (
              <p className="text-sm text-destructive">{orgStructureResult.error}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employee Experience</CardTitle>
            <CardDescription>Tenure, banking experience, and retirement outlook.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {employeeExperienceResult.ok ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Avg. Tenure</p>
                    <p className="font-medium text-foreground">{employeeExperienceResult.data.averageTenureYears} yrs</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg. Banking Experience</p>
                    <p className="font-medium text-foreground">{employeeExperienceResult.data.averageBankingExperienceYears} yrs</p>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Approaching retirement (≤3 yrs)</p>
                  {employeeExperienceResult.data.approachingRetirement.length === 0 ? (
                    <p className="text-xs text-muted-foreground">None.</p>
                  ) : (
                    <ul className="flex flex-col gap-1 text-xs">
                      {employeeExperienceResult.data.approachingRetirement.slice(0, 5).map((e) => (
                        <li key={e.employeeId} className="flex justify-between">
                          <span className="text-foreground">{e.name}</span>
                          <span className="text-muted-foreground">{e.yearsToRetirement} yrs</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-destructive">{employeeExperienceResult.error}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
