import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { WORK_LOCATIONS, formatEnumLabel } from "@/lib/api/employees"
import { fetchDepartments } from "@/lib/api/departments"
import {
  fetchLeaveRequests,
  fetchLeaveTypes,
  formatLeaveStatusLabel,
  type LeaveRequestStatus,
} from "@/lib/api/leave"
import { getSession } from "@/lib/get-session"

import { LeaveTabs } from "../leave-tabs"
import { DecideRequestForm } from "./decide-request-form"

const STATUS_VARIANT: Record<LeaveRequestStatus, "success" | "destructive" | "secondary" | "outline"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  PENDING_APPROVAL: "secondary",
  APPROVED: "success",
  REJECTED: "destructive",
  CANCELLED: "outline",
  COMPLETED: "secondary",
}

const ALL_STATUSES: LeaveRequestStatus[] = [
  "SUBMITTED",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
]

interface SearchParams {
  departmentId?: string
  workLocation?: string
  leaveTypeId?: string
  status?: string
}

export default async function AdminLeaveApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const filters = await searchParams
  const session = await getSession()

  const [pendingResult, allResult, departmentsResult, leaveTypesResult] = await Promise.all([
    fetchLeaveRequests({
      status: "PENDING_APPROVAL",
      departmentId: filters.departmentId,
      workLocation: filters.workLocation,
      leaveTypeId: filters.leaveTypeId,
    }),
    fetchLeaveRequests({
      departmentId: filters.departmentId,
      workLocation: filters.workLocation,
      leaveTypeId: filters.leaveTypeId,
      status: filters.status as LeaveRequestStatus | undefined,
    }),
    fetchDepartments(),
    fetchLeaveTypes(),
  ])

  const departments = departmentsResult.ok ? departmentsResult.data : []
  const leaveTypes = leaveTypesResult.ok ? leaveTypesResult.data : []
  const pending = pendingResult.ok ? pendingResult.data : []
  const all = allResult.ok ? allResult.data : []

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
              <label className="text-xs text-muted-foreground">Leave type</label>
              <Select name="leaveTypeId" defaultValue={filters.leaveTypeId ?? ""} className="w-44">
                <option value="">All types</option>
                {leaveTypes.map((leaveType) => (
                  <option key={leaveType.id} value={leaveType.id}>
                    {leaveType.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Status (all requests)</label>
              <Select name="status" defaultValue={filters.status ?? ""} className="w-44">
                <option value="">Any status</option>
                {ALL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatLeaveStatusLabel(status)}
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
            <Link href="/admin/leave/approvals" className="text-xs text-muted-foreground hover:underline">
              Clear filters
            </Link>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <CardHeader className="px-6 pt-6">
          <CardTitle>Pending approvals</CardTitle>
          <CardDescription>{pending.length} request(s) awaiting a decision.</CardDescription>
        </CardHeader>
        {!pendingResult.ok ? (
          <CardContent className="py-6 text-sm text-destructive">{pendingResult.error}</CardContent>
        ) : pending.length === 0 ? (
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nothing pending right now.
          </CardContent>
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
                  const currentApproval = request.approvals.find(
                    (approval) => approval.order === request.currentStepOrder
                  )
                  return (
                    <tr key={request.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {request.employee.firstName} {request.employee.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.employee.position?.department.name ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{request.leaveType.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {request.startDate.slice(0, 10)} → {request.endDate.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{request.numberOfDays}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {currentApproval ? formatEnumLabel(currentApproval.role) : "—"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <DecideRequestForm requestId={request.id} actingEmployeeId={session?.employeeId ?? null} />
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
          <CardTitle>All requests</CardTitle>
        </CardHeader>
        {!allResult.ok ? (
          <CardContent className="py-6 text-sm text-destructive">{allResult.error}</CardContent>
        ) : all.length === 0 ? (
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No leave requests match these filters.
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Leave type</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Days</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {all.map((request) => (
                  <tr key={request.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {request.employee.firstName} {request.employee.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{request.employee.employeeNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{request.leaveType.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {request.startDate.slice(0, 10)} → {request.endDate.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{request.numberOfDays}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[request.status]}>
                        {formatLeaveStatusLabel(request.status)}
                      </Badge>
                    </td>
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
