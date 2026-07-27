import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CASE_STATUS_LABELS,
  fetchAppealStats,
  fetchCasesByCategory,
  fetchCasesByStatus,
  fetchErOverview,
  fetchInvestigationStats,
  fetchMonthlyCaseTrend,
  formatErEnum,
} from "@/lib/api/employee-relations"
import { getSession } from "@/lib/get-session"

import { EmployeeRelationsTabs } from "./employee-relations-tabs"

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

function HorizontalBarList({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.value))

  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No data yet.</p>
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3 text-sm">
          <div className="w-40 shrink-0 truncate text-muted-foreground" title={row.label}>
            {row.label}
          </div>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }} />
          </div>
          <div className="w-10 shrink-0 text-right font-medium text-foreground">{row.value}</div>
        </div>
      ))}
    </div>
  )
}

function MonthlyTrendChart({ rows }: { rows: Array<{ month: string; count: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.count))
  return (
    <div className="flex h-32 items-end gap-1.5">
      {rows.map((row) => (
        <div key={row.month} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-24 w-full items-end">
            <div className="w-full rounded-t bg-primary" style={{ height: `${Math.max(2, (row.count / max) * 100)}%` }} title={`${row.month}: ${row.count}`} />
          </div>
          <span className="text-[10px] text-muted-foreground">{row.month.slice(5)}</span>
        </div>
      ))}
    </div>
  )
}

export default async function EmployeeRelationsDashboardPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [overviewResult, statusResult, categoryResult, trendResult, investigationResult, appealResult] = await Promise.all([
    fetchErOverview(actingEmployeeId),
    fetchCasesByStatus(actingEmployeeId),
    fetchCasesByCategory(actingEmployeeId),
    fetchMonthlyCaseTrend(actingEmployeeId),
    fetchInvestigationStats(actingEmployeeId),
    fetchAppealStats(actingEmployeeId),
  ])

  const statusRows = statusResult.ok ? statusResult.data.map((row) => ({ label: CASE_STATUS_LABELS[row.status], value: row.count })) : []
  const categoryRows = categoryResult.ok ? categoryResult.data.map((row) => ({ label: formatErEnum(row.category), value: row.count })) : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Employee Relations</h1>
          <p className="text-sm text-muted-foreground">
            Manage disciplinary cases, investigations, sanctions, grievances, and appeals with full confidentiality and audit trails.
          </p>
        </div>
        <Link href="/admin/employee-relations/cases/new" className={buttonVariants({ size: "sm" })}>
          New case
        </Link>
      </div>

      <EmployeeRelationsTabs />

      {!overviewResult.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{overviewResult.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Total cases" value={overviewResult.data.totalCases} />
          <KpiCard label="Open cases" value={overviewResult.data.openCases} />
          <KpiCard label="Under investigation" value={overviewResult.data.underInvestigation} />
          <KpiCard label="Closed cases" value={overviewResult.data.closedCases} />
          <KpiCard label="Appeals pending" value={overviewResult.data.appealsPending} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cases by status</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList rows={statusRows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cases by category</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList rows={categoryRows} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly case trend</CardTitle>
          <CardDescription>Cases reported over the last 12 months.</CardDescription>
        </CardHeader>
        <CardContent>{trendResult.ok ? <MonthlyTrendChart rows={trendResult.data} /> : <p className="text-sm text-muted-foreground">No data yet.</p>}</CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Investigations</CardTitle>
            <CardDescription>Completion time and overdue investigations.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {investigationResult.ok ? (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Avg. completion time</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {investigationResult.data.averageCompletionDays !== null ? `${investigationResult.data.averageCompletionDays} days` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{investigationResult.data.overdueCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{investigationResult.data.totalInvestigations}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{investigationResult.data.completedCount}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appeals</CardTitle>
            <CardDescription>Rate of decisions being appealed.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {appealResult.ok ? (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Appeal rate</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{appealResult.data.appealRate !== null ? `${appealResult.data.appealRate}%` : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{appealResult.data.pending}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total appeals</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{appealResult.data.totalAppeals}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
