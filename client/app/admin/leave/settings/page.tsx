import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { fetchEmployees } from "@/lib/api/employees"
import {
  fetchLeaveBalances,
  fetchLeaveSettings,
  fetchLeaveTypes,
  fetchPublicHolidaysPaginated,
} from "@/lib/api/leave"

import { LeaveTabs } from "../leave-tabs"

import { BalanceRow } from "./balance-row"
import { CarryForwardButton } from "./carry-forward-button"
import { CreateLeaveTypeForm } from "./create-leave-type-form"
import { HolidaysPanel } from "./holidays-panel"
import { LeaveSettingsForm } from "./leave-settings-form"
import { LeaveTypeCard } from "./leave-type-card"

interface SearchParams {
  [key: string]: string | undefined
  employeeId?: string
  year?: string
  holidaysPage?: string
}

export default async function AdminLeaveSettingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const filters = await searchParams
  const currentYear = new Date().getUTCFullYear()
  const year = filters.year ? Number(filters.year) : currentYear

  const [leaveTypesResult, holidaysResult, settingsResult, employeesResult] = await Promise.all([
    fetchLeaveTypes(true),
    fetchPublicHolidaysPaginated(true, filters.holidaysPage ? Number(filters.holidaysPage) : 1),
    fetchLeaveSettings(),
    fetchEmployees(),
  ])

  const balancesResult = filters.employeeId ? await fetchLeaveBalances(filters.employeeId, year) : null

  const leaveTypes = leaveTypesResult.ok ? leaveTypesResult.data : []
  const holidays = holidaysResult.ok ? holidaysResult.data.data : []
  const employees = employeesResult.ok ? employeesResult.data : []

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
          <CardTitle>Leave types</CardTitle>
          <CardDescription>
            Entitlements, documentation rules, approval workflow, and carry-forward — all configurable, nothing
            hardcoded.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!leaveTypesResult.ok ? (
            <p className="text-sm text-destructive">{leaveTypesResult.error}</p>
          ) : (
            leaveTypes.map((leaveType) => <LeaveTypeCard key={leaveType.id} leaveType={leaveType} />)
          )}
          <CreateLeaveTypeForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public holidays</CardTitle>
          <CardDescription>Automatically excluded from leave-day calculations.</CardDescription>
        </CardHeader>
        <CardContent>
          {!holidaysResult.ok ? (
            <p className="text-sm text-destructive">{holidaysResult.error}</p>
          ) : (
            <HolidaysPanel
              holidays={holidays}
              pagination={{
                page: holidaysResult.data.page,
                totalPages: holidaysResult.data.totalPages,
                total: holidaysResult.data.total,
                pageSize: holidaysResult.data.pageSize,
              }}
              searchParams={filters}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Working week</CardTitle>
          <CardDescription>Which days count as weekends bank-wide.</CardDescription>
        </CardHeader>
        <CardContent>
          {!settingsResult.ok ? (
            <p className="text-sm text-destructive">{settingsResult.error}</p>
          ) : (
            <LeaveSettingsForm settings={settingsResult.data} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Carry-forward</CardTitle>
          <CardDescription>
            Runs once, bank-wide: carries each employee&apos;s unused balance into the next year, per each leave
            type&apos;s carry-forward rule above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CarryForwardButton fromYear={currentYear - 1} toYear={currentYear} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employee balances</CardTitle>
          <CardDescription>Look up an employee&apos;s balances and apply manual adjustments.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Employee</label>
              <Select name="employeeId" defaultValue={filters.employeeId ?? ""} className="w-64">
                <option value="">Select an employee…</option>
                {employees.map((employee) => (
                  <option key={employee.employeeNumber} value={employee.employeeNumber}>
                    {employee.firstName} {employee.lastName} ({employee.employeeNumber})
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Year</label>
              <Select name="year" defaultValue={String(year)} className="w-28">
                {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              View
            </button>
          </form>

          {filters.employeeId && balancesResult ? (
            !balancesResult.ok ? (
              <p className="text-sm text-destructive">{balancesResult.error}</p>
            ) : balancesResult.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">No balances for this employee yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-2 font-medium">Leave type</th>
                      <th className="px-4 py-2 font-medium">Entitled</th>
                      <th className="px-4 py-2 font-medium">Carried</th>
                      <th className="px-4 py-2 font-medium">Taken</th>
                      <th className="px-4 py-2 font-medium">Pending</th>
                      <th className="px-4 py-2 font-medium">Remaining</th>
                      <th className="px-4 py-2 font-medium">Adjustment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {balancesResult.data.map((balance) => (
                      <BalanceRow key={balance.id} employeeId={filters.employeeId!} balance={balance} />
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
