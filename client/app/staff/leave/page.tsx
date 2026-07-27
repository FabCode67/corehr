import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Pagination } from "@/components/ui/pagination"
import { fetchEmployees } from "@/lib/api/employees"
import {
  fetchLeaveBalances,
  fetchLeaveRequestsPaginated,
  formatLeaveStatusLabel,
  type LeaveRequestStatus,
} from "@/lib/api/leave"
import { submitLeaveRequest } from "@/lib/api/leave-actions"
import { getSession } from "@/lib/get-session"

import { CancelRequestButton } from "./cancel-request-button"
import { LeaveRequestForm } from "./leave-request-form"

const STATUS_VARIANT: Record<LeaveRequestStatus, "success" | "destructive" | "secondary" | "outline"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  PENDING_APPROVAL: "secondary",
  APPROVED: "success",
  REJECTED: "destructive",
  CANCELLED: "outline",
  COMPLETED: "secondary",
}

const CANCELLABLE_STATUSES: LeaveRequestStatus[] = ["SUBMITTED", "PENDING_APPROVAL", "APPROVED"]

function isCancellable(status: LeaveRequestStatus, startDate: string) {
  if (!CANCELLABLE_STATUSES.includes(status)) return false
  if (status !== "APPROVED") return true
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  return new Date(startDate).getTime() > today.getTime()
}

export default async function StaffLeavePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const session = await getSession()

  if (!session?.employeeId) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Leave</h1>
          <p className="text-sm text-muted-foreground">
            Request leave, track balances, and follow approval status.
          </p>
        </div>
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Your login isn&apos;t linked to an employee record yet, so leave balances and requests
            can&apos;t be shown. Ask HR to link your account.
          </CardContent>
        </Card>
      </div>
    )
  }

  const employeeId = session.employeeId

  const [balancesResult, requestsResult, employeesResult] = await Promise.all([
    fetchLeaveBalances(employeeId),
    fetchLeaveRequestsPaginated({ employeeId }, page ? Number(page) : 1),
    fetchEmployees(),
  ])

  const balances = balancesResult.ok ? balancesResult.data : []
  const requests = requestsResult.ok ? requestsResult.data.data : []
  const colleagues = (employeesResult.ok ? employeesResult.data : [])
    .filter((employee) => employee.employeeNumber !== employeeId)
    .map((employee) => ({
      id: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      positionTitle: employee.position?.title ?? null,
    }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Leave</h1>
        <p className="text-sm text-muted-foreground">
          Request leave, track balances, and follow approval status.
        </p>
      </div>

      {!balancesResult.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{balancesResult.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {balances.map((balance) => (
            <Card key={balance.id}>
              <CardHeader>
                <CardTitle className="text-base">{balance.leaveType.name}</CardTitle>
                <CardDescription>{balance.year}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Entitlement" value={balance.entitledDays} />
                <Stat label="Carried forward" value={balance.carriedForwardDays} />
                <Stat label="Taken" value={balance.takenDays} />
                <Stat label="Pending" value={balance.pendingDays} />
                <Stat label="Remaining" value={balance.remainingDays} emphasize />
              </CardContent>
            </Card>
          ))}
          {balances.length === 0 ? (
            <Card className="border-dashed sm:col-span-2 lg:col-span-3">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No leave balances yet — this is set up automatically once your Employment Details
                are on file.
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {balances.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Request leave</CardTitle>
            <CardDescription>
              Working days are calculated automatically, excluding weekends and public holidays.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeaveRequestForm
              balances={balances}
              colleagues={colleagues}
              action={submitLeaveRequest.bind(null, employeeId)}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden p-0">
        <CardHeader className="px-6 pt-6">
          <CardTitle>My requests</CardTitle>
        </CardHeader>
        {!requestsResult.ok ? (
          <CardContent className="py-6 text-sm text-destructive">{requestsResult.error}</CardContent>
        ) : requests.length === 0 ? (
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No leave requests yet.
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Leave type</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Days</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{request.leaveType.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {request.startDate.slice(0, 10)} → {request.endDate.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{request.numberOfDays}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[request.status]}>
                        {formatLeaveStatusLabel(request.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {isCancellable(request.status, request.startDate) ? (
                        <CancelRequestButton requestId={request.id} />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {requestsResult.ok ? (
          <Pagination
            page={requestsResult.data.page}
            totalPages={requestsResult.data.totalPages}
            total={requestsResult.data.total}
            pageSize={requestsResult.data.pageSize}
            basePath="/staff/leave"
          />
        ) : null}
      </Card>
    </div>
  )
}

function Stat({ label, value, emphasize }: { label: string; value: number; emphasize?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={emphasize ? "text-lg font-semibold text-foreground" : "font-medium text-foreground"}>
        {value}
      </p>
    </div>
  )
}
