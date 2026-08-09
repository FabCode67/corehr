import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatEnumLabel } from "@/lib/api/employees"
import { fetchPendingForManager } from "@/lib/api/leave"
import { getSession } from "@/lib/get-session"

import { DecideRequestForm } from "../../../admin/leave/approvals/decide-request-form"

/**
 * Staff-portal equivalent of /admin/leave/approvals, scoped to just this
 * employee's own direct reports — powers the "line manager can approve
 * leave" request. Uses the same findPendingForManager()/decide() backend
 * plumbing the admin page's LINE_MANAGER-step rows already went through;
 * the only thing that changed on the backend was adding an authorization
 * check to decide() so a manager can only act on their own team's steps
 * (see LeaveRequestsService.assertCanDecideStep). Anyone can open this page
 * (no direct-reports check at the route level, matching this app's
 * session-trust model elsewhere) — it just shows an empty state if you
 * don't currently manage anyone.
 */
export default async function StaffLeaveApprovalsPage() {
  const session = await getSession()
  const employeeId = session?.employeeId ?? ""

  const pendingResult = await fetchPendingForManager(employeeId)
  const pending = pendingResult.ok ? pendingResult.data : []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Team Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Leave requests from your direct reports that are waiting on your decision.
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <CardHeader className="px-6 pt-6">
          <CardTitle>Pending your decision</CardTitle>
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
                  <th className="px-4 py-3 font-medium">Reason</th>
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
                      <td className="max-w-56 px-4 py-3 text-muted-foreground">
                        <p className="truncate" title={request.reason ?? ""}>
                          {request.reason || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {currentApproval ? formatEnumLabel(currentApproval.role) : "—"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <DecideRequestForm requestId={request.id} actingEmployeeId={employeeId || null} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
