import Link from "next/link"

import { AnnualLeavePlanTable } from "@/components/annual-leave-plan-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchDepartmentAnnualLeavePlan } from "@/lib/api/annual-leave-plan"
import { annualLeavePlanTemplateUrl } from "@/lib/api/export-urls"

import { DepartmentApiError, DepartmentEmptyState, DepartmentSwitcher, resolveDepartmentContext } from "../shared"
import { DepartmentDashboardTabs } from "../tabs"
import { AnnualLeavePlanUploadForm, TemplateDownloadLink } from "./upload-form"

export default async function DepartmentLeavePlanPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string; year?: string }>
}) {
  const { dept, year: yearParam } = await searchParams
  const context = await resolveDepartmentContext(dept)
  const year = yearParam ? Number(yearParam) : new Date().getFullYear()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Department Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Upload and review your department&apos;s forecasted annual leave schedule — a separate planning layer from actual leave
          requests, which employees still submit and you still approve through the Leave tab.
        </p>
      </div>

      {context.status === "error" ? <DepartmentApiError message={context.message} /> : null}
      {context.status === "empty" ? <DepartmentEmptyState /> : null}

      {context.status === "ok" ? (
        <>
          <DepartmentDashboardTabs active="leave-plan" dept={context.selectedDepartmentId} />
          <DepartmentSwitcher
            departments={context.departments}
            selectedDepartmentId={context.selectedDepartmentId}
            basePath="/staff/department-dashboard/leave-plan"
          />
          <YearSwitcher departmentId={context.selectedDepartmentId} year={year} />
          <div className="flex flex-wrap items-center gap-3">
            <TemplateDownloadLink href={annualLeavePlanTemplateUrl(context.selectedDepartmentId, context.actingEmployeeId, year)} />
          </div>
          <AnnualLeavePlanUploadForm departmentId={context.selectedDepartmentId} actingEmployeeId={context.actingEmployeeId} year={year} />
          <DepartmentLeavePlanTable departmentId={context.selectedDepartmentId} actingEmployeeId={context.actingEmployeeId} year={year} />
        </>
      ) : null}
    </div>
  )
}

function YearSwitcher({ departmentId, year }: { departmentId: string; year: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Link
        href={`/staff/department-dashboard/leave-plan?dept=${departmentId}&year=${year - 1}`}
        className="text-muted-foreground hover:text-foreground"
      >
        ← {year - 1}
      </Link>
      <span className="font-semibold text-foreground">{year}</span>
      <Link
        href={`/staff/department-dashboard/leave-plan?dept=${departmentId}&year=${year + 1}`}
        className="text-muted-foreground hover:text-foreground"
      >
        {year + 1} →
      </Link>
    </div>
  )
}

async function DepartmentLeavePlanTable({
  departmentId,
  actingEmployeeId,
  year,
}: {
  departmentId: string
  actingEmployeeId: string
  year: number
}) {
  const result = await fetchDepartmentAnnualLeavePlan(departmentId, actingEmployeeId, year)
  if (!result.ok) return <DepartmentApiError message={result.error} />

  return (
    <Card className="overflow-hidden p-0">
      <CardHeader className="px-6 pt-6">
        <CardTitle>{year} plan</CardTitle>
        <CardDescription>{result.data.length} employee(s) with a planned schedule uploaded.</CardDescription>
      </CardHeader>
      {result.data.length === 0 ? (
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No annual leave plan uploaded for {year} yet — download the template above to get started.
        </CardContent>
      ) : (
        <AnnualLeavePlanTable rows={result.data} year={year} />
      )}
    </Card>
  )
}
