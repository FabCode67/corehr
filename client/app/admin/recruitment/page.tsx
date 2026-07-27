import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import {
  APPLICATION_STATUS_LABELS,
  fetchOfferStats,
  fetchRecruitmentFunnel,
  fetchRecruitmentOverview,
  fetchTimeToHire,
  fetchVacanciesByDepartment,
} from "@/lib/api/recruitment"
import { getSession } from "@/lib/get-session"

import { RecruitmentTabs } from "./recruitment-tabs"

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  )
}

function HorizontalBarList({ rows, suffix = "" }: { rows: Array<{ label: string; value: number; sub?: string }>; suffix?: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value))

  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No data yet.</p>
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3 text-sm">
          <div className="w-36 shrink-0 truncate text-muted-foreground" title={row.label}>
            {row.label}
          </div>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }} />
          </div>
          <div className="w-24 shrink-0 text-right font-medium text-foreground">
            {row.value}
            {suffix}
            {row.sub ? <span className="text-muted-foreground"> {row.sub}</span> : null}
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function RecruitmentDashboardPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [overviewResult, funnelResult, offerStatsResult, timeToHireResult, vacanciesResult] = await Promise.all([
    fetchRecruitmentOverview(actingEmployeeId),
    fetchRecruitmentFunnel(actingEmployeeId),
    fetchOfferStats(actingEmployeeId),
    fetchTimeToHire(actingEmployeeId),
    fetchVacanciesByDepartment(actingEmployeeId),
  ])

  const funnelRows = funnelResult.ok
    ? funnelResult.data.map((row) => ({ label: APPLICATION_STATUS_LABELS[row.status], value: row.count }))
    : []

  const vacancyRows = vacanciesResult.ok
    ? vacanciesResult.data.map((row) => ({
        label: row.departmentName,
        value: row.vacancies,
        sub: `(${row.openRequisitions} requisition${row.openRequisitions === 1 ? "" : "s"})`,
      }))
    : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Recruitment Management</h1>
          <p className="text-sm text-muted-foreground">
            Workforce planning through onboarding — the full hiring pipeline, from vacancy to new hire.
          </p>
        </div>
        <Link href="/admin/recruitment/workforce-plans/new" className={buttonVariants({ size: "sm" })}>
          New workforce plan
        </Link>
      </div>

      <RecruitmentTabs />

      {overviewResult.ok ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <KpiCard label="Open requisitions" value={overviewResult.data.openRequisitions} />
          <KpiCard label="Active applications" value={overviewResult.data.activeApplications} />
          <KpiCard label="Interviews this week" value={overviewResult.data.interviewsThisWeek} />
          <KpiCard label="Pending offers" value={overviewResult.data.pendingOffers} />
          <KpiCard label="Hires this month" value={overviewResult.data.hiresThisMonth} />
        </div>
      ) : (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{!overviewResult.ok ? overviewResult.error : ""}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline funnel</CardTitle>
            <CardDescription>Applications by current stage.</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarList rows={funnelRows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open vacancies by department</CardTitle>
            <CardDescription>Approved requisitions with vacancies still open.</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarList rows={vacancyRows} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Offer acceptance rate</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {offerStatsResult.ok && offerStatsResult.data.acceptanceRate !== null
                ? `${offerStatsResult.data.acceptanceRate}%`
                : "—"}
            </p>
            {offerStatsResult.ok ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {offerStatsResult.data.byStatus.ACCEPTED ?? 0} accepted, {offerStatsResult.data.byStatus.DECLINED ?? 0} declined,{" "}
                {offerStatsResult.data.byStatus.EXPIRED ?? 0} expired
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Average time to hire</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {timeToHireResult.ok && timeToHireResult.data.averageDays !== null
                ? `${timeToHireResult.data.averageDays} days`
                : "—"}
            </p>
            {timeToHireResult.ok ? (
              <p className="mt-1 text-xs text-muted-foreground">Based on {timeToHireResult.data.sampleSize} hire(s)</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
