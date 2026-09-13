import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchDepartmentLeaveBalances, fetchDepartmentLeaveCalendar, fetchDepartmentLeaveRequests } from "@/lib/api/department-dashboard"
import { formatEnumLabel } from "@/lib/api/employees"
import { formatLeaveStatusLabel, MONTH_NAMES, type LeaveRequest, type PublicHoliday } from "@/lib/api/leave"
import { fullName } from "@/lib/format-name"

import { DecideRequestForm } from "../../../admin/leave/approvals/decide-request-form"
import { CancelRequestButton } from "../../leave/cancel-request-button"
import { DepartmentApiError, DepartmentEmptyState, DepartmentSwitcher, resolveDepartmentContext } from "../shared"
import { DepartmentDashboardTabs } from "../tabs"
import { DepartmentBalanceAdjuster } from "./balance-adjuster"

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const OPEN_STATUSES = ["SUBMITTED", "PENDING_APPROVAL", "APPROVED"]

function holidayForDate(date: Date, holidays: PublicHoliday[]) {
  return holidays.find((holiday) => {
    const holidayDate = new Date(holiday.date)
    if (holiday.isRecurringAnnually) {
      return holidayDate.getUTCMonth() === date.getUTCMonth() && holidayDate.getUTCDate() === date.getUTCDate()
    }
    return (
      holidayDate.getUTCFullYear() === date.getUTCFullYear() &&
      holidayDate.getUTCMonth() === date.getUTCMonth() &&
      holidayDate.getUTCDate() === date.getUTCDate()
    )
  })
}

function requestsForDate(date: Date, requests: LeaveRequest[]) {
  const time = date.getTime()
  return requests.filter((request) => {
    const start = new Date(request.startDate).getTime()
    const end = new Date(request.endDate).getTime()
    return time >= start && time <= end
  })
}

/**
 * Head of Department leave management — calendar, department-wide
 * approve/reject queue, department-wide cancel-on-behalf, and per-employee
 * balances with adjustment, per the confirmed follow-up scope (see
 * DepartmentDashboardService's "Leave management" section doc comment).
 * Approve/reject and cancel post straight to the existing generic
 * /leave/requests/:id/decide and /:id/cancel endpoints via the SAME
 * DecideRequestForm/CancelRequestButton components the admin and staff
 * approvals pages already use — only LeaveRequestsService's own
 * authorization needed to become department-head-aware, not the UI.
 */
export default async function DepartmentLeavePage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string; year?: string; month?: string }>
}) {
  const { dept, year: yearParam, month: monthParam } = await searchParams
  const context = await resolveDepartmentContext(dept)

  const today = new Date()
  const year = yearParam ? Number(yearParam) : today.getUTCFullYear()
  const month = monthParam ? Number(monthParam) : today.getUTCMonth() + 1

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Department Dashboard</h1>
        <p className="text-sm text-muted-foreground">Leave calendar, approvals, cancellations, and balances for your department.</p>
      </div>

      {context.status === "error" ? <DepartmentApiError message={context.message} /> : null}
      {context.status === "empty" ? <DepartmentEmptyState /> : null}

      {context.status === "ok" ? (
        <>
          <DepartmentDashboardTabs active="leave" dept={context.selectedDepartmentId} />
          <DepartmentSwitcher
            departments={context.departments}
            selectedDepartmentId={context.selectedDepartmentId}
            basePath="/staff/department-dashboard/leave"
          />
          <DepartmentLeaveContent
            departmentId={context.selectedDepartmentId}
            actingEmployeeId={context.actingEmployeeId}
            year={year}
            month={month}
          />
        </>
      ) : null}
    </div>
  )
}

async function DepartmentLeaveContent({
  departmentId,
  actingEmployeeId,
  year,
  month,
}: {
  departmentId: string
  actingEmployeeId: string
  year: number
  month: number
}) {
  const [calendarResult, requestsResult, balancesResult] = await Promise.all([
    fetchDepartmentLeaveCalendar(departmentId, actingEmployeeId, year, month),
    fetchDepartmentLeaveRequests(departmentId, actingEmployeeId),
    fetchDepartmentLeaveBalances(departmentId, actingEmployeeId),
  ])

  const today = new Date()
  const requests = requestsResult.ok ? requestsResult.data : []
  const pending = requests.filter((request) => request.status === "PENDING_APPROVAL")
  const cancellable = requests.filter((request) => OPEN_STATUSES.includes(request.status))

  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1))
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const leadingBlanks = firstOfMonth.getUTCDay()
  const cells: Array<{ date: Date; dayOfMonth: number } | null> = []
  for (let index = 0; index < leadingBlanks; index += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(Date.UTC(year, month - 1, day)), dayOfMonth: day })
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  function monthHref(y: number, m: number) {
    const params = new URLSearchParams()
    params.set("dept", departmentId)
    params.set("year", String(y))
    params.set("month", String(m))
    return `/staff/department-dashboard/leave?${params.toString()}`
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {MONTH_NAMES[month - 1]} {year}
          </CardTitle>
          <CardDescription>Approved and pending leave across your department, plus public holidays.</CardDescription>
          <CardAction className="flex gap-2">
            <Link href={monthHref(prevYear, prevMonth)} className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted">
              ← Previous
            </Link>
            <Link href={monthHref(nextYear, nextMonth)} className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted">
              Next →
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          {!calendarResult.ok ? (
            <p className="text-sm text-destructive">{calendarResult.error}</p>
          ) : (
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border text-xs">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="bg-muted/60 px-2 py-1.5 text-center font-medium text-muted-foreground">
                  {label}
                </div>
              ))}
              {cells.map((cell, index) => {
                if (!cell) return <div key={`blank-${index}`} className="min-h-24 bg-background" />
                const holiday = holidayForDate(cell.date, calendarResult.data.holidays)
                const dayRequests = requestsForDate(cell.date, calendarResult.data.requests)
                const isToday =
                  cell.date.getTime() === new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())).getTime()

                return (
                  <div key={cell.dayOfMonth} className={`flex min-h-24 flex-col gap-1 bg-background p-1.5 ${holiday ? "bg-amber-500/5" : ""}`}>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[0.7rem] font-medium ${isToday ? "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                      >
                        {cell.dayOfMonth}
                      </span>
                    </div>
                    {holiday ? (
                      <p className="truncate rounded bg-amber-500/15 px-1 py-0.5 text-[0.65rem] font-medium text-amber-700 dark:text-amber-400">
                        {holiday.name}
                      </p>
                    ) : null}
                    <div className="flex flex-col gap-0.5">
                      {dayRequests.slice(0, 3).map((request) => (
                        <p
                          key={request.id}
                          className={`truncate rounded px-1 py-0.5 text-[0.65rem] ${
                            request.status === "APPROVED"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                          title={`${request.employee.firstName} ${request.employee.lastName} — ${request.leaveType.name}`}
                        >
                          {request.employee.firstName} {request.employee.lastName[0]}.
                        </p>
                      ))}
                      {dayRequests.length > 3 ? (
                        <Badge variant="outline" className="w-fit text-[0.6rem]">
                          +{dayRequests.length - 3} more
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <CardHeader className="px-6 pt-6">
          <CardTitle>Pending approvals</CardTitle>
          <CardDescription>{pending.length} request(s) awaiting a decision.</CardDescription>
        </CardHeader>
        {!requestsResult.ok ? (
          <CardContent className="py-6 text-sm text-destructive">{requestsResult.error}</CardContent>
        ) : pending.length === 0 ? (
          <CardContent className="py-8 text-center text-sm text-muted-foreground">Nothing pending right now.</CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Leave type</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Days</th>
                  <th className="px-4 py-3 font-medium">Current step</th>
                  <th className="px-4 py-3 font-medium">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pending.map((request) => {
                  const currentApproval = request.approvals.find((approval) => approval.order === request.currentStepOrder)
                  return (
                    <tr key={request.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{fullName(request.employee)}</p>
                        <p className="text-xs text-muted-foreground">{request.employee.position?.department.name ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{request.leaveType.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {request.startDate.slice(0, 10)} → {request.endDate.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{request.numberOfDays}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{currentApproval ? formatEnumLabel(currentApproval.role) : "—"}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <DecideRequestForm requestId={request.id} actingEmployeeId={actingEmployeeId} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <CardHeader className="px-6 pt-6">
          <CardTitle>Submitted &amp; approved leave</CardTitle>
          <CardDescription>Cancel on an employee&apos;s behalf — a reason is required and both the employee and HR are notified.</CardDescription>
        </CardHeader>
        {!requestsResult.ok ? (
          <CardContent className="py-6 text-sm text-destructive">{requestsResult.error}</CardContent>
        ) : cancellable.length === 0 ? (
          <CardContent className="py-8 text-center text-sm text-muted-foreground">No open leave requests right now.</CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Leave type</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cancellable.map((request) => (
                  <tr key={request.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{fullName(request.employee)}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{request.leaveType.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {request.startDate.slice(0, 10)} → {request.endDate.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={request.status === "APPROVED" ? "success" : "outline"}>{formatLeaveStatusLabel(request.status)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <CancelRequestButton requestId={request.id} actingEmployeeId={actingEmployeeId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <CardHeader className="px-6 pt-6">
          <CardTitle>Leave balances</CardTitle>
          <CardDescription>Every active employee&apos;s balance across leave types this year.</CardDescription>
        </CardHeader>
        {!balancesResult.ok ? (
          <CardContent className="py-6 text-sm text-destructive">{balancesResult.error}</CardContent>
        ) : balancesResult.data.length === 0 ? (
          <CardContent className="py-8 text-center text-sm text-muted-foreground">No employees to show.</CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Leave type</th>
                  <th className="px-4 py-3 font-medium">Entitled</th>
                  <th className="px-4 py-3 font-medium">Carried fwd</th>
                  <th className="px-4 py-3 font-medium">Taken</th>
                  <th className="px-4 py-3 font-medium">Pending</th>
                  <th className="px-4 py-3 font-medium">Remaining</th>
                  <th className="px-4 py-3 font-medium">Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {balancesResult.data.flatMap((row) =>
                  row.balances.map((balance, index) => (
                    <tr key={`${row.employee.employeeNumber}-${balance.leaveTypeId}`} className="hover:bg-muted/30">
                      {index === 0 ? (
                        <td className="px-4 py-2 align-top font-medium text-foreground" rowSpan={row.balances.length}>
                          {fullName(row.employee)}
                        </td>
                      ) : null}
                      <td className="px-4 py-2 text-muted-foreground">{balance.leaveType.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{balance.entitledDays}</td>
                      <td className="px-4 py-2 text-muted-foreground">{balance.carriedForwardDays}</td>
                      <td className="px-4 py-2 text-muted-foreground">{balance.takenDays}</td>
                      <td className="px-4 py-2 text-muted-foreground">{balance.pendingDays}</td>
                      <td className="px-4 py-2 font-medium text-foreground">{balance.remainingDays}</td>
                      <td className="px-4 py-2">
                        <DepartmentBalanceAdjuster
                          departmentId={departmentId}
                          actingEmployeeId={actingEmployeeId}
                          employeeId={row.employee.employeeNumber}
                          balance={balance}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
