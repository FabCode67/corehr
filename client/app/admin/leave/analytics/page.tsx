import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { WORK_LOCATIONS, formatEnumLabel } from "@/lib/api/employees"
import { fetchDepartments } from "@/lib/api/departments"
import {
  fetchBalanceExtremes,
  fetchCurrentlyOnLeave,
  fetchMonthlyTrends,
  fetchTypeDistribution,
  fetchUpcomingLeave,
  fetchUtilizationByBranch,
  fetchUtilizationByDepartment,
  fetchUtilizationByGender,
  MONTH_NAMES,
} from "@/lib/api/leave"

import { LeaveTabs } from "../leave-tabs"

interface SearchParams {
  departmentId?: string
  workLocation?: string
  year?: string
}

function HorizontalBarList({
  rows,
}: {
  rows: Array<{ label: string; value: number; sub?: string }>
}) {
  const max = Math.max(1, ...rows.map((row) => row.value))

  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No data for this period.</p>
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3 text-sm">
          <div className="w-32 shrink-0 truncate text-muted-foreground" title={row.label}>
            {row.label}
          </div>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
            />
          </div>
          <div className="w-16 shrink-0 text-right font-medium text-foreground">
            {row.value}
            {row.sub ? <span className="text-muted-foreground"> {row.sub}</span> : null}
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function AdminLeaveAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const filters = await searchParams
  const analyticsFilters = {
    departmentId: filters.departmentId,
    workLocation: filters.workLocation,
    year: filters.year ? Number(filters.year) : undefined,
  }

  const [
    departmentsResult,
    byDepartmentResult,
    byBranchResult,
    byGenderResult,
    monthlyResult,
    typeDistributionResult,
    balanceExtremesResult,
    upcomingResult,
    currentlyOnLeaveResult,
  ] = await Promise.all([
    fetchDepartments(),
    fetchUtilizationByDepartment(analyticsFilters),
    fetchUtilizationByBranch(analyticsFilters),
    fetchUtilizationByGender(analyticsFilters),
    fetchMonthlyTrends(analyticsFilters),
    fetchTypeDistribution(analyticsFilters),
    fetchBalanceExtremes(analyticsFilters, 5),
    fetchUpcomingLeave(analyticsFilters, 30),
    fetchCurrentlyOnLeave(analyticsFilters),
  ])

  const departments = departmentsResult.ok ? departmentsResult.data : []
  const currentYear = new Date().getUTCFullYear()
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Leave Management</h1>
        <p className="text-sm text-muted-foreground">
          Approve or reject leave requests, review policy, and track the leave calendar.
        </p>
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
              <Select name="departmentId" defaultValue={filters.departmentId ?? ""} className="w-44">
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Branch</label>
              <Select name="workLocation" defaultValue={filters.workLocation ?? ""} className="w-44">
                <option value="">All branches</option>
                {WORK_LOCATIONS.map((location) => (
                  <option key={location} value={location}>
                    {formatEnumLabel(location)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Year</label>
              <Select name="year" defaultValue={String(analyticsFilters.year ?? currentYear)} className="w-28">
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
            </div>
            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Utilization by department</CardTitle>
            <CardDescription>Approved leave days taken this year.</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarList
              rows={
                byDepartmentResult.ok
                  ? byDepartmentResult.data.map((row) => ({
                      label: row.departmentName,
                      value: row.days,
                      sub: `(${row.requests})`,
                    }))
                  : []
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Utilization by branch</CardTitle>
            <CardDescription>Approved leave days taken this year.</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarList
              rows={
                byBranchResult.ok
                  ? byBranchResult.data.map((row) => ({
                      label: formatEnumLabel(row.workLocation),
                      value: row.days,
                      sub: `(${row.requests})`,
                    }))
                  : []
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Utilization by gender</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList
              rows={
                byGenderResult.ok
                  ? byGenderResult.data.map((row) => ({
                      label: formatEnumLabel(row.gender),
                      value: row.days,
                      sub: `(${row.requests})`,
                    }))
                  : []
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave type distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList
              rows={
                typeDistributionResult.ok
                  ? typeDistributionResult.data.map((row) => ({
                      label: row.leaveTypeName,
                      value: row.days,
                      sub: `(${row.requests})`,
                    }))
                  : []
              }
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly trend</CardTitle>
          <CardDescription>Approved leave days taken per month.</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyResult.ok ? (
            <div className="flex h-40 items-end gap-2">
              {(() => {
                const max = Math.max(1, ...monthlyResult.data.map((month) => month.days))
                return monthlyResult.data.map((month) => (
                  <div key={month.month} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-32 w-full items-end">
                      <div
                        className="w-full rounded-t bg-primary"
                        style={{ height: `${Math.max(2, (month.days / max) * 100)}%` }}
                        title={`${month.days} day(s)`}
                      />
                    </div>
                    <span className="text-[0.65rem] text-muted-foreground">
                      {MONTH_NAMES[month.month - 1].slice(0, 3)}
                    </span>
                  </div>
                ))
              })()}
            </div>
          ) : (
            <p className="text-sm text-destructive">{monthlyResult.error}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Highest remaining balances</CardTitle>
            <CardDescription>Annual leave, top 5.</CardDescription>
          </CardHeader>
          <CardContent>
            {balanceExtremesResult.ok && balanceExtremesResult.data.highest.length > 0 ? (
              <ul className="flex flex-col gap-2 text-sm">
                {balanceExtremesResult.data.highest.map((entry) => (
                  <li key={`${entry.employeeId}-${entry.leaveTypeName}`} className="flex justify-between">
                    <span className="text-foreground">{entry.employeeName}</span>
                    <span className="font-medium text-emerald-600">{entry.remainingDays} days</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">No data.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lowest remaining balances</CardTitle>
            <CardDescription>Annual leave, bottom 5.</CardDescription>
          </CardHeader>
          <CardContent>
            {balanceExtremesResult.ok && balanceExtremesResult.data.lowest.length > 0 ? (
              <ul className="flex flex-col gap-2 text-sm">
                {balanceExtremesResult.data.lowest.map((entry) => (
                  <li key={`${entry.employeeId}-${entry.leaveTypeName}`} className="flex justify-between">
                    <span className="text-foreground">{entry.employeeName}</span>
                    <span className="font-medium text-destructive">{entry.remainingDays} days</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">No data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Currently on leave</CardTitle>
          </CardHeader>
          <CardContent>
            {currentlyOnLeaveResult.ok && currentlyOnLeaveResult.data.length > 0 ? (
              <ul className="flex flex-col gap-2 text-sm">
                {currentlyOnLeaveResult.data.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {entry.employee.firstName} {entry.employee.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.employee.position?.department.name ?? "—"} · {entry.leaveType.name}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      until {entry.endDate.slice(0, 10)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">No one is on leave today.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming leave</CardTitle>
            <CardDescription>Next 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingResult.ok && upcomingResult.data.length > 0 ? (
              <ul className="flex flex-col gap-2 text-sm">
                {upcomingResult.data.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {entry.employee.firstName} {entry.employee.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{entry.leaveType.name}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {entry.startDate.slice(0, 10)} → {entry.endDate.slice(0, 10)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">Nothing coming up.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
