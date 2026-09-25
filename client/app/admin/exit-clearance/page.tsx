import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchExitClearanceHrDashboard } from "@/lib/api/exit-clearance"
import { fullName } from "@/lib/format-name"

import { ExitClearanceTabs } from "./exit-clearance-tabs"

const STAT_CARDS: { key: "completed" | "pending" | "rejected" | "overdue"; label: string; accent: string }[] = [
  { key: "completed", label: "Completed", accent: "text-emerald-600 dark:text-emerald-400" },
  { key: "pending", label: "Pending", accent: "text-foreground" },
  { key: "rejected", label: "Returned", accent: "text-amber-600 dark:text-amber-400" },
  { key: "overdue", label: "Overdue", accent: "text-destructive" },
]

/**
 * HR-facing bank-wide view of the Exit Clearance Workflow — every clearance
 * form currently tracked across every active (still-exiting) employee,
 * grouped by status, plus a per-employee breakdown so HR can see exactly
 * which exits are blocked and on what. See
 * ExitClearanceService.getHrDashboard() and schema.prisma's "EXIT
 * CLEARANCE WORKFLOW" module note.
 */
export default async function ExitClearanceDashboardPage() {
  const dashboardResult = await fetchExitClearanceHrDashboard()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Exit Clearance</h1>
        <p className="text-sm text-muted-foreground">
          Bank-wide status of every clearance form currently in progress for employees going through the exit process.
        </p>
      </div>

      <ExitClearanceTabs />

      {!dashboardResult.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{dashboardResult.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : dashboardResult.data.employees.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">No exits currently in progress</CardTitle>
            <CardDescription>This fills in once HR starts an employee&apos;s exit process and clearance forms are assigned.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STAT_CARDS.map((stat) => (
              <Card key={stat.key}>
                <CardContent className="pt-6">
                  <p className={`text-2xl font-semibold ${stat.accent}`}>{dashboardResult.data.counts[stat.key]}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">By employee</CardTitle>
              <CardDescription>Sorted by most overdue first.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {dashboardResult.data.employees.map((row) => (
                <Link
                  key={row.employee.employeeNumber}
                  href={`/admin/employees/${row.employee.employeeNumber}`}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">{fullName(row.employee)}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.employee.employeeNumber} · {row.completed} of {row.total} completed
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {row.overdue > 0 ? <Badge variant="destructive">{row.overdue} overdue</Badge> : null}
                    {row.rejected > 0 ? <Badge variant="outline">{row.rejected} returned</Badge> : null}
                    {row.pending > 0 ? <Badge variant="secondary">{row.pending} pending</Badge> : null}
                    {row.completed === row.total ? <Badge variant="success">All clear</Badge> : null}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
