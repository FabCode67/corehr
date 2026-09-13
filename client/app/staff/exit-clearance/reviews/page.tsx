import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchReviewerQueue } from "@/lib/api/exit-clearance"
import { fullName } from "@/lib/format-name"
import { getSession } from "@/lib/get-session"

import { ExitClearanceTabs } from "../exit-clearance-tabs"
import { ReviewActions } from "./review-actions"

/** Reviewer queue for whoever currently holds a clearance form's
 *  responsible position (Employee.positionId) — see
 *  ExitClearanceService.getReviewerQueue(). Only ever shows anything for
 *  someone holding a position named as an Exit Clearance Form Template's
 *  responsiblePositionId; empty otherwise (same "always show the nav entry,
 *  page handles it" convention as Team Approvals). */
export default async function StaffExitClearanceReviewsPage() {
  const session = await getSession()
  const employeeId = session?.employeeId ?? ""

  const queueResult = employeeId ? await fetchReviewerQueue(employeeId) : null
  const queue = queueResult?.ok ? queueResult.data : []
  const readyForReview = queue.filter((a) => a.readyForReview)
  const waitingOnEmployee = queue.filter((a) => !a.readyForReview)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Exit Clearance</h1>
        <p className="text-sm text-muted-foreground">Clearance forms routed to a position you currently hold.</p>
      </div>

      <ExitClearanceTabs />

      {queue.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Nothing to review right now</CardTitle>
            <CardDescription>Forms appear here when they&apos;re routed to a position you hold.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {readyForReview.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ready for your review</CardTitle>
                <CardDescription>{readyForReview.length} form(s) awaiting your approval or signature.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {readyForReview.map((assignment) => (
                  <div key={assignment.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {assignment.template.name}
                        {assignment.template.isMandatory ? <span className="ml-1 text-xs text-muted-foreground">(mandatory)</span> : null}
                      </p>
                      <p className="text-xs text-muted-foreground">{fullName(assignment.employee)} · {assignment.employee.employeeNumber}</p>
                      <p className="text-xs text-muted-foreground">Due {new Date(assignment.dueDate).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {assignment.isOverdue ? <Badge variant="destructive">Overdue</Badge> : null}
                      <ReviewActions assignmentId={assignment.id} reviewerId={employeeId} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {waitingOnEmployee.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Waiting on the employee</CardTitle>
                <CardDescription>These forms will appear above once the employee completes their part.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {waitingOnEmployee.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">{assignment.template.name}</p>
                      <p className="text-xs">{fullName(assignment.employee)} · {assignment.employee.employeeNumber}</p>
                    </div>
                    {assignment.isOverdue ? <Badge variant="destructive">Overdue</Badge> : <Badge variant="outline">Pending</Badge>}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  )
}
