import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchDepartmentPositions } from "@/lib/api/department-dashboard"
import { fullName } from "@/lib/format-name"

import { DepartmentApiError, DepartmentEmptyState, DepartmentSwitcher, resolveDepartmentContext } from "../shared"
import { DepartmentDashboardTabs } from "../tabs"

export default async function DepartmentPositionsPage({
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
        <p className="text-sm text-muted-foreground">Positions and fill/vacancy status for the department(s) you head.</p>
      </div>

      {context.status === "error" ? <DepartmentApiError message={context.message} /> : null}
      {context.status === "empty" ? <DepartmentEmptyState /> : null}

      {context.status === "ok" ? (
        <>
          <DepartmentDashboardTabs active="positions" dept={context.selectedDepartmentId} />
          <DepartmentSwitcher
            departments={context.departments}
            selectedDepartmentId={context.selectedDepartmentId}
            basePath="/staff/department-dashboard/positions"
          />
          <PositionsTable departmentId={context.selectedDepartmentId} actingEmployeeId={context.actingEmployeeId} />
        </>
      ) : null}
    </div>
  )
}

async function PositionsTable({ departmentId, actingEmployeeId }: { departmentId: string; actingEmployeeId: string }) {
  const positionsResult = await fetchDepartmentPositions(departmentId, actingEmployeeId)
  if (!positionsResult.ok) {
    return <DepartmentApiError message={positionsResult.error} />
  }

  const positions = positionsResult.data
  const vacantCount = positions.filter((p) => p.isVacant).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Positions</CardTitle>
        <CardDescription>
          {positions.length} position{positions.length === 1 ? "" : "s"} — {vacantCount} vacant.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Level</th>
              <th className="px-3 py-2">Holder(s)</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  No positions yet.
                </td>
              </tr>
            ) : (
              positions.map((position) => (
                <tr key={position.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium text-foreground">{position.title}</td>
                  <td className="px-3 py-2 text-muted-foreground">{position.unit?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{position.level.code ?? position.level.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {position.employees.length === 0
                      ? "—"
                      : position.employees.map((employee) => fullName(employee)).join(", ")}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={position.isVacant ? "destructive" : "success"}>
                      {position.isVacant ? "Vacant" : "Filled"}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
