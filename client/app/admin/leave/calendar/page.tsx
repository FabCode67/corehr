import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { WORK_LOCATIONS, formatEnumLabel } from "@/lib/api/employees"
import { fetchDepartments } from "@/lib/api/departments"
import { fetchLeaveCalendar, MONTH_NAMES, type LeaveRequest, type PublicHoliday } from "@/lib/api/leave"

import { LeaveTabs } from "../leave-tabs"

interface SearchParams {
  year?: string
  month?: string
  departmentId?: string
  workLocation?: string
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function holidayForDate(date: Date, holidays: PublicHoliday[]) {
  return holidays.find((holiday) => {
    const holidayDate = new Date(holiday.date)
    if (holiday.isRecurringAnnually) {
      return (
        holidayDate.getUTCMonth() === date.getUTCMonth() &&
        holidayDate.getUTCDate() === date.getUTCDate()
      )
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

export default async function AdminLeaveCalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const filters = await searchParams
  const today = new Date()
  const year = filters.year ? Number(filters.year) : today.getUTCFullYear()
  const month = filters.month ? Number(filters.month) : today.getUTCMonth() + 1 // 1-12

  const [calendarResult, departmentsResult] = await Promise.all([
    fetchLeaveCalendar(year, month, { departmentId: filters.departmentId, workLocation: filters.workLocation }),
    fetchDepartments(),
  ])

  const departments = departmentsResult.ok ? departmentsResult.data : []
  const requests = calendarResult.ok ? calendarResult.data.requests : []
  const holidays = calendarResult.ok ? calendarResult.data.holidays : []

  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1))
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const leadingBlanks = firstOfMonth.getUTCDay() // 0 = Sunday

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
    params.set("year", String(y))
    params.set("month", String(m))
    if (filters.departmentId) params.set("departmentId", filters.departmentId)
    if (filters.workLocation) params.set("workLocation", filters.workLocation)
    return `/admin/leave/calendar?${params.toString()}`
  }

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
            <input type="hidden" name="year" value={year} />
            <input type="hidden" name="month" value={month} />
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
            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {MONTH_NAMES[month - 1]} {year}
          </CardTitle>
          <CardDescription>Approved and pending leave, plus public holidays.</CardDescription>
          <CardAction className="flex gap-2">
            <Link
              href={monthHref(prevYear, prevMonth)}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
            >
              ← Previous
            </Link>
            <Link
              href={monthHref(nextYear, nextMonth)}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
            >
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
                if (!cell) {
                  return <div key={`blank-${index}`} className="min-h-24 bg-background" />
                }
                const holiday = holidayForDate(cell.date, holidays)
                const dayRequests = requestsForDate(cell.date, requests)
                const isToday = cell.date.getTime() === new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())).getTime()

                return (
                  <div
                    key={cell.dayOfMonth}
                    className={`flex min-h-24 flex-col gap-1 bg-background p-1.5 ${holiday ? "bg-amber-500/5" : ""}`}
                  >
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
    </div>
  )
}
