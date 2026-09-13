import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchDepartmentLearningHours } from "@/lib/api/department-dashboard"
import { fullName } from "@/lib/format-name"

import { DepartmentApiError, DepartmentEmptyState, DepartmentSwitcher, resolveDepartmentContext } from "../shared"
import { DepartmentDashboardTabs } from "../tabs"

export default async function DepartmentLearningPage({
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
        <p className="text-sm text-muted-foreground">Training/learning completion hours, per employee.</p>
      </div>

      {context.status === "error" ? <DepartmentApiError message={context.message} /> : null}
      {context.status === "empty" ? <DepartmentEmptyState /> : null}

      {context.status === "ok" ? (
        <>
          <DepartmentDashboardTabs active="learning" dept={context.selectedDepartmentId} />
          <DepartmentSwitcher
            departments={context.departments}
            selectedDepartmentId={context.selectedDepartmentId}
            basePath="/staff/department-dashboard/learning"
          />
          <LearningTable departmentId={context.selectedDepartmentId} actingEmployeeId={context.actingEmployeeId} />
        </>
      ) : null}
    </div>
  )
}

async function LearningTable({ departmentId, actingEmployeeId }: { departmentId: string; actingEmployeeId: string }) {
  const rowsResult = await fetchDepartmentLearningHours(departmentId, actingEmployeeId)
  if (!rowsResult.ok) {
    return <DepartmentApiError message={rowsResult.error} />
  }

  const rows = rowsResult.data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Learning Hours</CardTitle>
        <CardDescription>
          Completed = HR-verified courses only. In progress / assigned counts are also shown for context.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
              <th className="px-3 py-2">Employee</th>
              <th className="px-3 py-2">Completed hours</th>
              <th className="px-3 py-2">Completed courses</th>
              <th className="px-3 py-2">In progress</th>
              <th className="px-3 py-2">Assigned</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  No employees to show.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.employeeNumber} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium text-foreground">{fullName(row)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.completedHours}h</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.completedCount}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.inProgressCount}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.assignedCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
