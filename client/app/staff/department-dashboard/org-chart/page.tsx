import { Card, CardContent } from "@/components/ui/card"
import { OrgChartTree } from "@/components/org-chart/org-chart-tree"
import { fetchDepartmentOrgChart } from "@/lib/api/department-dashboard"

import { DepartmentApiError, DepartmentEmptyState, DepartmentSwitcher, resolveDepartmentContext } from "../shared"
import { DepartmentDashboardTabs } from "../tabs"

const LEGEND = [
  { swatch: "bg-[#0d2c4d] border border-white/20", label: "Standard position" },
  { swatch: "bg-[#0d2c4d] border border-[#B8860B]/60", label: "Executive position" },
  { swatch: "bg-[#0d2c4d] border border-destructive/60", label: "Vacant" },
]

export default async function DepartmentOrgChartPage({
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
        <p className="text-sm text-muted-foreground">Organization chart, scoped to the department(s) you head.</p>
      </div>

      {context.status === "error" ? <DepartmentApiError message={context.message} /> : null}
      {context.status === "empty" ? <DepartmentEmptyState /> : null}

      {context.status === "ok" ? (
        <>
          <DepartmentDashboardTabs active="org-chart" dept={context.selectedDepartmentId} />
          <DepartmentSwitcher
            departments={context.departments}
            selectedDepartmentId={context.selectedDepartmentId}
            basePath="/staff/department-dashboard/org-chart"
          />
          <OrgChart departmentId={context.selectedDepartmentId} actingEmployeeId={context.actingEmployeeId} />
        </>
      ) : null}
    </div>
  )
}

async function OrgChart({ departmentId, actingEmployeeId }: { departmentId: string; actingEmployeeId: string }) {
  const result = await fetchDepartmentOrgChart(departmentId, actingEmployeeId)
  if (!result.ok) {
    return <DepartmentApiError message={result.error} />
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className={`size-3 rounded-sm ${item.swatch}`} />
            {item.label}
          </span>
        ))}
      </div>
      <Card className="overflow-x-auto border-white/10 bg-[#081a2e] p-0">
        <CardContent className="p-0">
          <OrgChartTree roots={result.data} />
        </CardContent>
      </Card>
    </>
  )
}
