import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchDepartmentPerformance, type DepartmentPerformanceRow } from "@/lib/api/department-dashboard"
import { fullName } from "@/lib/format-name"

import { BreakdownBars } from "../charts"
import { DepartmentApiError, DepartmentEmptyState, DepartmentSwitcher, resolveDepartmentContext } from "../shared"
import { DepartmentDashboardTabs } from "../tabs"

const REVIEW_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  ACKNOWLEDGED: "Acknowledged",
  FINALIZED: "Finalized",
}

export default async function DepartmentPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>
}) {
  const { dept } = await searchParams
  const context = await resolveDepartmentContext(dept)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Department Dashboard</h1>
        <p className="text-sm text-muted-foreground">How each employee in your department is performing, based on their latest review.</p>
      </div>

      {context.status === "error" ? <DepartmentApiError message={context.message} /> : null}
      {context.status === "empty" ? <DepartmentEmptyState /> : null}

      {context.status === "ok" ? (
        <>
          <DepartmentDashboardTabs active="performance" dept={context.selectedDepartmentId} />
          <DepartmentSwitcher
            departments={context.departments}
            selectedDepartmentId={context.selectedDepartmentId}
            basePath="/staff/department-dashboard/performance"
          />
          <DepartmentPerformanceContent departmentId={context.selectedDepartmentId} actingEmployeeId={context.actingEmployeeId} />
        </>
      ) : null}
    </div>
  )
}

async function DepartmentPerformanceContent({ departmentId, actingEmployeeId }: { departmentId: string; actingEmployeeId: string }) {
  const result = await fetchDepartmentPerformance(departmentId, actingEmployeeId)
  if (!result.ok) {
    return <DepartmentApiError message={result.error} />
  }

  const rows = result.data
  const byStatus = countBy(rows, (row) => REVIEW_STATUS_LABEL[row.status] ?? row.status)
  const ratingDistribution = countBy(
    rows.filter((row) => row.overallRating !== null),
    (row) => `${row.overallRating} / 5`
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reviews by status</CardTitle>
            <CardDescription>Latest review on record per employee.</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownBars data={byStatus} barLabel="Employees" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rating distribution</CardTitle>
            <CardDescription>Only reviews with a recorded overall rating.</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownBars data={ratingDistribution} barLabel="Employees" />
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <CardHeader className="px-6 pt-6">
          <CardTitle>Employees</CardTitle>
          <CardDescription>{rows.length} employee(s) with a review on record.</CardDescription>
        </CardHeader>
        {rows.length === 0 ? (
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No performance reviews on record for this department yet.
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.employee.employeeNumber} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{fullName(row.employee)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.period.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatTitleCase(row.reviewType)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.status === "FINALIZED" ? "success" : "outline"}>{REVIEW_STATUS_LABEL[row.status] ?? row.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.overallRating !== null ? `${row.overallRating} / 5` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function countBy(rows: DepartmentPerformanceRow[], keyOf: (row: DepartmentPerformanceRow) => string) {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = keyOf(row)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from(counts.entries()).map(([label, count]) => ({ label, count }))
}

function formatTitleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ")
}
