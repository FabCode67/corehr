import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatEnumLabel } from "@/lib/api/employees"
import { fetchLeaveBalances, fetchLeaveRequests } from "@/lib/api/leave"

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

/**
 * Full-profile Leave section for the admin Employee Detail page — current-year
 * balances plus recent request history for this one employee. HR is
 * unrestricted here (LeaveBalancesService/LeaveRequestsService have no
 * per-employee access gate for an isAdmin actor), so unlike the
 * department-head equivalent this always renders when there's data.
 */
export async function LeaveSection({ employeeId }: { employeeId: string }) {
  const [balancesResult, requestsResult] = await Promise.all([
    fetchLeaveBalances(employeeId),
    fetchLeaveRequests({ employeeId }),
  ])

  if (!balancesResult.ok && !requestsResult.ok) return null

  const balances = balancesResult.ok ? balancesResult.data : []
  const requests = requestsResult.ok ? requestsResult.data : []
  if (balances.length === 0 && requests.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Leave</CardTitle>
        <CardDescription>Current-year balances and recent requests.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {balances.map((balance) => (
            <div key={balance.id} className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{balance.leaveType.name}</p>
              <p className="text-lg font-semibold text-foreground">{balance.remainingDays}</p>
              <p className="text-xs text-muted-foreground">of {balance.entitledDays + balance.carriedForwardDays} days remaining</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {requests.slice(0, 8).map((request) => (
            <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm">
              <span>
                {request.leaveType.name} · {formatDate(request.startDate)} – {formatDate(request.endDate)}
              </span>
              <Badge variant="outline">{formatEnumLabel(request.status)}</Badge>
            </div>
          ))}
          {requests.length === 0 ? <p className="text-sm text-muted-foreground">No leave requests on record.</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}
