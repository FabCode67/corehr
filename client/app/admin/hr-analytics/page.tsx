import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatEnumLabel } from "@/lib/api/employee-utils"
import { fetchEmployees } from "@/lib/api/employees"
import { executiveDashboardPdfUrl } from "@/lib/api/export-urls"
import { fetchExecutiveDashboardOverview } from "@/lib/api/executive-dashboard"
import {
  fetchAttritionRate,
  fetchAverageAge,
  fetchBandDistribution,
  fetchDemographics,
  fetchEmployeeDistribution,
  fetchExitSummary,
  fetchHiringExitTrend,
  fetchLeaveUtilization,
  fetchPositionFillRate,
  fetchTotalStaff,
} from "@/lib/api/hr-analytics"
import { getSession } from "@/lib/get-session"

import { AnalyticsFilters } from "./analytics-filters"
import { parseAnalyticsFilters, type AnalyticsSearchParams } from "./analytics-filters-utils"
import { BarList } from "./bar-list"
import {
  AgeHistogramChart,
  BandDistributionChart,
  DepartmentBarChart,
  ExitTrendChart,
  HiringExitTrendChart,
} from "./charts"
import { ExecutiveSummarySection } from "./executive-summary"
import { KpiCards } from "./kpi-cards"

const CONTRACT_EXPIRY_WINDOW_DAYS = 90

/** Where the analytics that used to be on this page now live. */
const MORE_ANALYTICS = [
  { label: "Leave analytics", href: "/admin/leave/analytics", detail: "Utilization, leave types, balances, who is on leave" },
  { label: "Recruitment", href: "/admin/recruitment", detail: "Pipeline funnel, vacancies, time to hire" },
  { label: "Performance", href: "/admin/performance", detail: "Rating distribution, by department, trends" },
  { label: "Learning & Development", href: "/admin/learning/reports", detail: "Completion, mandatory compliance, cost" },
  { label: "Workforce report", href: "/admin/reports/workforce", detail: "Position fill rate, organizational structure, employee experience" },
  { label: "Data exports", href: "/admin/reports/exports", detail: "XLSX / CSV / PDF / PPTX, statistics snapshot, custom report" },
] as const

export default async function HrAnalyticsPage({ searchParams }: { searchParams: Promise<AnalyticsSearchParams> }) {
  const raw = await searchParams
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""
  const filters = parseAnalyticsFilters(raw)

  const [
    totalStaffResult,
    averageAgeResult,
    bandDistributionResult,
    attritionRateResult,
    positionFillRateResult,
    leaveUtilizationResult,
    employeeDistributionResult,
    exitSummaryResult,
    demographicsResult,
    hiringExitTrendResult,
    execOverviewResult,
    employeesResult,
  ] = await Promise.all([
    fetchTotalStaff(filters, actingEmployeeId),
    fetchAverageAge(filters, actingEmployeeId),
    fetchBandDistribution(filters, actingEmployeeId),
    fetchAttritionRate(filters, actingEmployeeId),
    // Only feeds the Position Fill Rate KPI card — the per-department chart
    // lives in Reports > Workforce Report.
    fetchPositionFillRate(filters, actingEmployeeId),
    fetchLeaveUtilization(filters, actingEmployeeId),
    fetchEmployeeDistribution(filters, actingEmployeeId),
    fetchExitSummary(filters, actingEmployeeId),
    fetchDemographics(filters, actingEmployeeId),
    fetchHiringExitTrend(filters, actingEmployeeId),
    fetchExecutiveDashboardOverview(actingEmployeeId),
    fetchEmployees(),
  ])

  let contractsExpiringCount: number | null = null
  if (employeesResult.ok) {
    const now = new Date()
    const windowEnd = new Date(now.getTime() + CONTRACT_EXPIRY_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    contractsExpiringCount = employeesResult.data.filter((e) => {
      if (!e.contractEndDate) return false
      const end = new Date(e.contractEndDate)
      return end >= now && end <= windowEnd
    }).length
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">HR Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time workforce statistics, trends, and organizational insights.</p>
        </div>
        <Link href="/admin/reports" className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-muted">
          Reports &amp; exports →
        </Link>
      </div>

      <AnalyticsFilters raw={raw} basePath="/admin/hr-analytics" actingEmployeeId={actingEmployeeId} description="Applies to every card and chart below. Supports single-year, month, quarter, or an explicit date range." />

      <div>
        <h2 className="text-lg font-semibold text-foreground">Key Metrics</h2>
        <p className="text-sm text-muted-foreground">Headline workforce numbers for the filters above.</p>
      </div>

      {totalStaffResult.ok &&
      averageAgeResult.ok &&
      bandDistributionResult.ok &&
      attritionRateResult.ok &&
      positionFillRateResult.ok &&
      leaveUtilizationResult.ok &&
      demographicsResult.ok &&
      exitSummaryResult.ok ? (
        <KpiCards
          totalStaff={totalStaffResult.data}
          averageAge={averageAgeResult.data}
          ageHistogram={demographicsResult.data.ageHistogram}
          genderDistribution={demographicsResult.data.genderDistribution}
          bandDistribution={bandDistributionResult.data}
          attritionRate={attritionRateResult.data}
          voluntaryExits={exitSummaryResult.data.byReason.find((r) => r.key === "RESIGNATION")?.count ?? 0}
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

      {execOverviewResult.ok ? (
        <ExecutiveSummarySection
          overview={execOverviewResult.data}
          pdfUrl={executiveDashboardPdfUrl(actingEmployeeId)}
          contractsExpiringCount={contractsExpiringCount}
          contractsExpiringWindowDays={CONTRACT_EXPIRY_WINDOW_DAYS}
        />
      ) : (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{execOverviewResult.error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold text-foreground">Charts &amp; Trends</h2>
        <p className="text-sm text-muted-foreground">
          Department and demographic breakdowns, plus multi-year hiring and exit trends.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Employee Distribution by Department</CardTitle>
          </CardHeader>
          <CardContent>{employeeDistributionResult.ok ? <DepartmentBarChart data={employeeDistributionResult.data} /> : <p className="text-sm text-destructive">{employeeDistributionResult.error}</p>}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Band Distribution</CardTitle>
            <CardDescription>Headcount across every band.</CardDescription>
          </CardHeader>
          <CardContent>{bandDistributionResult.ok ? <BandDistributionChart data={bandDistributionResult.data} /> : <p className="text-sm text-destructive">{bandDistributionResult.error}</p>}</CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Hiring vs. Exit Trend</CardTitle>
            <CardDescription>Every year on record — hires against exits.</CardDescription>
          </CardHeader>
          <CardContent>
            {hiringExitTrendResult.ok ? <HiringExitTrendChart data={hiringExitTrendResult.data} /> : <p className="text-sm text-destructive">{hiringExitTrendResult.error}</p>}
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

      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">More analytics &amp; reports</CardTitle>
          <CardDescription>Detailed analytics now live with their own modules, and exports and regulatory reports under Reports.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MORE_ANALYTICS.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
              <p className="text-sm font-medium text-foreground">{item.label} →</p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
