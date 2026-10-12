import { AnalyticsFilters } from "@/app/admin/hr-analytics/analytics-filters"
import { parseAnalyticsFilters, type AnalyticsSearchParams } from "@/app/admin/hr-analytics/analytics-filters-utils"
import { BarList } from "@/app/admin/hr-analytics/bar-list"
import { PositionFillRateChart } from "@/app/admin/hr-analytics/charts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmployeeExperience, fetchOrgStructure, fetchPositionFillRate } from "@/lib/api/hr-analytics"
import { getSession } from "@/lib/get-session"

export default async function WorkforceReportPage({ searchParams }: { searchParams: Promise<AnalyticsSearchParams> }) {
  const raw = await searchParams
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""
  const filters = parseAnalyticsFilters(raw)

  const [positionFillRateResult, orgStructureResult, employeeExperienceResult] = await Promise.all([
    fetchPositionFillRate(filters, actingEmployeeId),
    fetchOrgStructure(filters, actingEmployeeId),
    fetchEmployeeExperience(filters, actingEmployeeId),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Workforce Report</h1>
        <p className="text-sm text-muted-foreground">
          Position fill rate, organizational structure, and employee experience — moved here from HR Analytics.
        </p>
      </div>

      <AnalyticsFilters raw={raw} basePath="/admin/reports/workforce" actingEmployeeId={actingEmployeeId} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Position Fill Rate by Department</CardTitle>
            <CardDescription>Identify departments with vacant positions.</CardDescription>
          </CardHeader>
          <CardContent>
            {positionFillRateResult.ok ? (
              <PositionFillRateChart
                data={positionFillRateResult.data.byDepartment.map((d) => ({
                  name: d.name as string,
                  fillRate: d.fillRate as number,
                  filled: d.filled as number,
                  total: d.total as number,
                }))}
              />
            ) : (
              <p className="text-sm text-destructive">{positionFillRateResult.error}</p>
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
