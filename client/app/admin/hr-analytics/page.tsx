import Link from "next/link"
import { Suspense } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatEnumLabel } from "@/lib/api/employee-utils"
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
  type HrAnalyticsFilters,
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

interface SectionProps {
  filters: HrAnalyticsFilters
  actingEmployeeId: string
}

/**
 * The page shell renders immediately; every section below streams in on its
 * own (React Suspense) as its data arrives, instead of the whole dashboard
 * waiting for the slowest of ~20 requests. Charts are separate sections so
 * the headline numbers show up first and each card appears when ready.
 */
export default async function HrAnalyticsPage({ searchParams }: { searchParams: Promise<AnalyticsSearchParams> }) {
  const raw = await searchParams
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""
  const filters = parseAnalyticsFilters(raw)
  const section = { filters, actingEmployeeId }

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

      <Suspense fallback={<SectionSkeleton height="h-48" />}>
        <AnalyticsFilters
          raw={raw}
          basePath="/admin/hr-analytics"
          actingEmployeeId={actingEmployeeId}
          description="Applies to every card and chart below. Supports single-year, month, quarter, or an explicit date range."
        />
      </Suspense>

      <div>
        <h2 className="text-lg font-semibold text-foreground">Key Metrics</h2>
        <p className="text-sm text-muted-foreground">Headline workforce numbers for the filters above.</p>
      </div>
      <Suspense fallback={<SectionSkeleton height="h-40" />}>
        <KeyMetricsSection {...section} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton height="h-40" />}>
        <ExecutiveSection actingEmployeeId={actingEmployeeId} />
      </Suspense>

      <div>
        <h2 className="text-lg font-semibold text-foreground">Charts &amp; Trends</h2>
        <p className="text-sm text-muted-foreground">
          Department and demographic breakdowns, plus multi-year hiring and exit trends.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Suspense fallback={<SectionSkeleton height="h-72" className="lg:col-span-2" />}>
          <DepartmentDistributionCard {...section} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton height="h-72" />}>
          <BandDistributionCard {...section} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton height="h-72" className="lg:col-span-2" />}>
          <HiringExitTrendCard {...section} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton height="h-72" />}>
          <ExitSummaryCard {...section} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton height="h-72" />}>
          <DemographicsCard {...section} />
        </Suspense>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">More analytics &amp; reports</CardTitle>
          <CardDescription>Detailed analytics live with their own modules, and exports and regulatory reports under Reports.</CardDescription>
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

function SectionSkeleton({ height, className = "" }: { height: string; className?: string }) {
  return <div aria-busy="true" className={`animate-pulse rounded-xl border border-border bg-muted/40 ${height} ${className}`} />
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-dashed border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  )
}

async function KeyMetricsSection({ filters, actingEmployeeId }: SectionProps) {
  const [totalStaff, averageAge, bandDistribution, attritionRate, positionFillRate, leaveUtilization, demographics, exitSummary] =
    await Promise.all([
      fetchTotalStaff(filters, actingEmployeeId),
      fetchAverageAge(filters, actingEmployeeId),
      fetchBandDistribution(filters, actingEmployeeId),
      fetchAttritionRate(filters, actingEmployeeId),
      // Only feeds the Position Fill Rate KPI — the per-department chart
      // lives in Reports > Workforce Report.
      fetchPositionFillRate(filters, actingEmployeeId),
      fetchLeaveUtilization(filters, actingEmployeeId),
      fetchDemographics(filters, actingEmployeeId),
      fetchExitSummary(filters, actingEmployeeId),
    ])

  if (
    !totalStaff.ok ||
    !averageAge.ok ||
    !bandDistribution.ok ||
    !attritionRate.ok ||
    !positionFillRate.ok ||
    !leaveUtilization.ok ||
    !demographics.ok ||
    !exitSummary.ok
  ) {
    return <ErrorCard message="Some KPI cards failed to load. Try adjusting your filters or refreshing." />
  }

  return (
    <KpiCards
      totalStaff={totalStaff.data}
      averageAge={averageAge.data}
      ageHistogram={demographics.data.ageHistogram}
      genderDistribution={demographics.data.genderDistribution}
      bandDistribution={bandDistribution.data}
      attritionRate={attritionRate.data}
      voluntaryExits={exitSummary.data.byReason.find((r) => r.key === "RESIGNATION")?.count ?? 0}
      positionFillRate={positionFillRate.data}
      leaveUtilization={leaveUtilization.data}
    />
  )
}

async function ExecutiveSection({ actingEmployeeId }: { actingEmployeeId: string }) {
  const overview = await fetchExecutiveDashboardOverview(actingEmployeeId)
  if (!overview.ok) return <ErrorCard message={overview.error} />

  return (
    <ExecutiveSummarySection
      overview={overview.data}
      pdfUrl={executiveDashboardPdfUrl(actingEmployeeId)}
      contractsExpiringCount={overview.data.employees.contractsExpiringNext90Days}
      contractsExpiringWindowDays={CONTRACT_EXPIRY_WINDOW_DAYS}
    />
  )
}

async function DepartmentDistributionCard({ filters, actingEmployeeId }: SectionProps) {
  const result = await fetchEmployeeDistribution(filters, actingEmployeeId)
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Employee Distribution by Department</CardTitle>
      </CardHeader>
      <CardContent>{result.ok ? <DepartmentBarChart data={result.data} /> : <p className="text-sm text-destructive">{result.error}</p>}</CardContent>
    </Card>
  )
}

async function BandDistributionCard({ filters, actingEmployeeId }: SectionProps) {
  const result = await fetchBandDistribution(filters, actingEmployeeId)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Band Distribution</CardTitle>
        <CardDescription>Headcount across every band.</CardDescription>
      </CardHeader>
      <CardContent>{result.ok ? <BandDistributionChart data={result.data} /> : <p className="text-sm text-destructive">{result.error}</p>}</CardContent>
    </Card>
  )
}

async function HiringExitTrendCard({ filters, actingEmployeeId }: SectionProps) {
  const result = await fetchHiringExitTrend(filters, actingEmployeeId)
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Hiring vs. Exit Trend</CardTitle>
        <CardDescription>Every year on record — hires against exits.</CardDescription>
      </CardHeader>
      <CardContent>{result.ok ? <HiringExitTrendChart data={result.data} /> : <p className="text-sm text-destructive">{result.error}</p>}</CardContent>
    </Card>
  )
}

async function ExitSummaryCard({ filters, actingEmployeeId }: SectionProps) {
  const result = await fetchExitSummary(filters, actingEmployeeId)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Exit Summary</CardTitle>
        <CardDescription>{result.ok ? `${result.data.totalExits} exits in the selected period.` : ""}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {result.ok ? (
          <>
            <ExitTrendChart data={result.data.trend} />
            <BarList rows={result.data.byReason.map((r) => ({ label: r.label, value: r.count }))} />
          </>
        ) : (
          <p className="text-sm text-destructive">{result.error}</p>
        )}
      </CardContent>
    </Card>
  )
}

async function DemographicsCard({ filters, actingEmployeeId }: SectionProps) {
  const result = await fetchDemographics(filters, actingEmployeeId)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Demographics</CardTitle>
        <CardDescription>Age, gender, and contract type.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {result.ok ? (
          <>
            <AgeHistogramChart data={result.data.ageHistogram} />
            <BarList rows={result.data.genderDistribution.map((g) => ({ label: formatEnumLabel(g.label), value: g.count }))} />
            <BarList rows={result.data.contractTypeDistribution.map((c) => ({ label: formatEnumLabel(c.label), value: c.count }))} />
          </>
        ) : (
          <p className="text-sm text-destructive">{result.error}</p>
        )}
      </CardContent>
    </Card>
  )
}
