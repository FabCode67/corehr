import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  fetchFormsComplianceByCategory,
  fetchFormsCompletionStats,
  fetchFormsDepartmentComparison,
  fetchFormsOverview,
  fetchFormsStatusDistribution,
  fetchPendingSignaturesByRole,
  INSTANCE_STATUS_LABELS,
  SIGNER_ROLE_LABELS,
} from "@/lib/api/forms"
import { getSession } from "@/lib/get-session"

import { FormsTabs } from "./forms-tabs"

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

export default async function FormsDashboardPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [overviewResult, statusResult, completionResult, pendingByRoleResult, departmentResult, complianceResult] = await Promise.all([
    fetchFormsOverview(actingEmployeeId),
    fetchFormsStatusDistribution(actingEmployeeId),
    fetchFormsCompletionStats(actingEmployeeId),
    fetchPendingSignaturesByRole(actingEmployeeId),
    fetchFormsDepartmentComparison(actingEmployeeId),
    fetchFormsComplianceByCategory(actingEmployeeId),
  ])

  const statusRows = statusResult.ok ? statusResult.data.map((row) => ({ label: INSTANCE_STATUS_LABELS[row.status], value: row.count })) : []
  const pendingByRoleRows = pendingByRoleResult.ok ? pendingByRoleResult.data.map((row) => ({ label: SIGNER_ROLE_LABELS[row.role], value: row.count })) : []
  const departmentRows = departmentResult.ok
    ? departmentResult.data.map((row) => ({ label: row.departmentName, value: row.total, sub: `(${row.completed} completed)` }))
    : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Forms Management</h1>
          <p className="text-sm text-muted-foreground">
            Build, assign, complete, and track HR forms end to end — from a no-code form builder to signed digital records.
          </p>
        </div>
        <Link href="/admin/forms/assigned/new" className={buttonVariants({ size: "sm" })}>
          Assign a form
        </Link>
      </div>

      <FormsTabs />

      {overviewResult.ok ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Assigned" value={overviewResult.data.assigned} />
          <KpiCard label="In progress" value={overviewResult.data.inProgress} />
          <KpiCard label="Pending signatures" value={overviewResult.data.pendingSignatures} />
          <KpiCard label="Completed" value={overviewResult.data.completed} />
          <KpiCard label="Overdue" value={overviewResult.data.overdue} />
          <KpiCard label="Rejected" value={overviewResult.data.rejected} />
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
            <CardTitle>Forms by status</CardTitle>
            <CardDescription>Every form instance, grouped by lifecycle status.</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarList rows={statusRows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending signatures by role</CardTitle>
            <CardDescription>Where the approval chain is currently backing up.</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarList rows={pendingByRoleRows} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Completion rate</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {completionResult.ok && completionResult.data.completionRate !== null ? `${completionResult.data.completionRate}%` : "—"}
            </p>
            {completionResult.ok ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {completionResult.data.completedCount} of {completionResult.data.totalInstances} form(s) completed
                {completionResult.data.averageCompletionDays !== null ? ` · avg ${completionResult.data.averageCompletionDays} days to complete` : ""}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Forms by department</CardTitle>
            <CardDescription>Assigned employee&apos;s department.</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarList rows={departmentRows} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compliance status by category</CardTitle>
          <CardDescription>Completion vs. overdue, per form category.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!complianceResult.ok || complianceResult.data.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Completed</th>
                    <th className="px-4 py-3 font-medium">Overdue</th>
                    <th className="px-4 py-3 font-medium">Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {complianceResult.data.map((row) => (
                    <tr key={row.categoryId}>
                      <td className="px-4 py-3 font-medium text-foreground">{row.categoryName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.total}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.completed}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.overdue}</td>
                      <td className="px-4 py-3">
                        <Badge variant={row.complianceRate !== null && row.complianceRate >= 80 ? "success" : "outline"}>
                          {row.complianceRate !== null ? `${row.complianceRate}%` : "—"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
