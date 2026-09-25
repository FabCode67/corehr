import { AnnualLeavePlanTable } from "@/components/annual-leave-plan-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { annualLeavePlanExportUrl, fetchAllAnnualLeavePlans, fetchAnnualLeavePlanAnalytics } from "@/lib/api/annual-leave-plan"
import { fetchDepartments } from "@/lib/api/departments"
import { getSession } from "@/lib/get-session"

import { LeaveTabs } from "../leave-tabs"
import { PlannedLeaveByDepartmentPie, PlannedLeaveByMonthBar } from "./charts"

interface SearchParams {
  departmentId?: string
  year?: string
}

/**
 * HR's bank-wide Annual Leave Plan — every department's uploaded plan
 * (each Head of Department uploads their own, see
 * /staff/department-dashboard/leave-plan), consolidated with an export and
 * two chart views. This is a forecast/planning layer, deliberately separate
 * from the Approvals/Calendar tabs' actual leave-request workflow.
 */
export default async function AdminAnnualLeavePlanPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = await searchParams
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""
  const currentYear = new Date().getUTCFullYear()
  const year = filters.year ? Number(filters.year) : currentYear
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]

  const [departmentsResult, rowsResult, analyticsResult] = await Promise.all([
    fetchDepartments(),
    fetchAllAnnualLeavePlans(actingEmployeeId, year, filters.departmentId),
    fetchAnnualLeavePlanAnalytics(actingEmployeeId, year, filters.departmentId),
  ])

  const departments = departmentsResult.ok ? departmentsResult.data : []

  const exportParams = new URLSearchParams({ actingEmployeeId, year: String(year) })
  if (filters.departmentId) exportParams.set("departmentId", filters.departmentId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Leave Management</h1>
          <p className="text-sm text-muted-foreground">
            Every department&apos;s uploaded Annual Leave Plan, consolidated — a forecast of when staff intend to take leave, separate
            from the Approvals/Calendar tabs&apos; actual leave requests.
          </p>
        </div>
        <a
          href={annualLeavePlanExportUrl(actingEmployeeId, year, filters.departmentId)}
          className="inline-flex h-9 items-center rounded-lg border border-input px-3 text-sm font-medium text-foreground hover:bg-muted"
        >
          Export XLSX
        </a>
      </div>

      <LeaveTabs />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Department</label>
              <Select name="departmentId" defaultValue={filters.departmentId ?? ""} className="w-48">
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Year</label>
              <Select name="year" defaultValue={String(year)} className="w-28">
                {yearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
            <button type="submit" className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80">
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

      {!analyticsResult.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{analyticsResult.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-semibold text-foreground">{analyticsResult.data.totalEmployeesPlanned}</p>
                <p className="text-xs text-muted-foreground">Employees planned</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-semibold text-foreground">{analyticsResult.data.totalPlannedDays}</p>
                <p className="text-xs text-muted-foreground">Total planned days</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-semibold text-foreground">{analyticsResult.data.averageLeaveBalance}</p>
                <p className="text-xs text-muted-foreground">Avg. leave balance</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Planned leave days by department</CardTitle>
                <CardDescription>{year} forecast.</CardDescription>
              </CardHeader>
              <CardContent>
                <PlannedLeaveByDepartmentPie data={analyticsResult.data.byDepartment} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Planned leave days by month</CardTitle>
                <CardDescription>{year} forecast, in scope of the filters above.</CardDescription>
              </CardHeader>
              <CardContent>
                <PlannedLeaveByMonthBar data={analyticsResult.data.byMonth} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card className="overflow-hidden p-0">
        <CardHeader className="px-6 pt-6">
          <CardTitle>{year} plan, by employee</CardTitle>
          <CardDescription>
            {rowsResult.ok ? `${rowsResult.data.length} employee(s) with a planned schedule uploaded.` : "Can't reach the API."}
          </CardDescription>
        </CardHeader>
        {!rowsResult.ok ? null : rowsResult.data.length === 0 ? (
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No annual leave plan uploaded for {year} yet.
          </CardContent>
        ) : (
          <AnnualLeavePlanTable rows={rowsResult.data} year={year} showDepartment />
        )}
      </Card>
    </div>
  )
}
