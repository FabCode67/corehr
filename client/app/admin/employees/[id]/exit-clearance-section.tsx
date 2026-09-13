import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchExitClearanceProgress, type ExitClearanceStatus } from "@/lib/api/exit-clearance"
import { fullName } from "@/lib/format-name"

import { ExitClearanceReviewOverride } from "./exit-clearance-review-override"

const STATUS_LABEL: Record<ExitClearanceStatus, string> = { PENDING: "Pending", COMPLETED: "Completed", REJECTED: "Rejected" }
const STATUS_VARIANT: Record<ExitClearanceStatus, "outline" | "success" | "destructive"> = {
  PENDING: "outline",
  COMPLETED: "success",
  REJECTED: "destructive",
}

/**
 * HR-facing view of the configurable Exit Clearance Workflow — see
 * schema.prisma's "EXIT CLEARANCE WORKFLOW" module note. Supersedes the old
 * flat ExitDocumentsSection checklist: each form here is routed to a real
 * department/position, tracks employee-vs-reviewer progress separately, and
 * surfaces rejected/overdue state rather than a single isCompleted toggle.
 * HR can act directly via ExitClearanceReviewOverride (the same
 * isAdmin-fallback authority ExitClearanceService.review() already grants),
 * but day-to-day review normally happens in the Staff Portal reviewer queue
 * of whoever holds the responsible position.
 */
export async function ExitClearanceSection({ employeeId, actingEmployeeId }: { employeeId: string; actingEmployeeId: string }) {
  const progressResult = await fetchExitClearanceProgress(employeeId)
  const progress = progressResult.ok ? progressResult.data : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Exit Clearance</CardTitle>
        <CardDescription>
          {progress && progress.total > 0
            ? `${progress.completed} of ${progress.total} completed${progress.rejected > 0 ? ` · ${progress.rejected} returned` : ""}${progress.overdue > 0 ? ` · ${progress.overdue} overdue` : ""} — every mandatory form must be completed before the exit can be confirmed.`
            : "No exit clearance forms assigned yet."}
        </CardDescription>
      </CardHeader>
      {progress && progress.total > 0 ? (
        <CardContent className="flex flex-col gap-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${progress.allMandatoryCompleted ? "bg-emerald-500" : "bg-primary"}`}
              style={{ width: `${(progress.completed / progress.total) * 100}%` }}
            />
          </div>
          {progress.assignments.map((assignment) => {
            const readyForReview = !assignment.template.requiresEmployeeCompletion || Boolean(assignment.employeeCompletedAt)
            return (
              <div
                key={assignment.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {assignment.template.name}
                    {assignment.template.isMandatory ? <span className="ml-1 text-xs text-muted-foreground">(mandatory)</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {assignment.template.responsibleDepartment.name} · {assignment.template.responsiblePosition.title} · due{" "}
                    {new Date(assignment.dueDate).toLocaleDateString()}
                  </p>
                  {assignment.status === "COMPLETED" && (assignment.confirmedBy || assignment.signedBy) ? (
                    <p className="text-xs text-muted-foreground">
                      Approved by {fullName(assignment.confirmedBy ?? assignment.signedBy!)}
                    </p>
                  ) : null}
                  {assignment.status === "REJECTED" && assignment.lastActionComment ? (
                    <p className="text-xs text-destructive">Returned: {assignment.lastActionComment}</p>
                  ) : null}
                  {assignment.status === "PENDING" && assignment.template.requiresEmployeeCompletion && !assignment.employeeCompletedAt ? (
                    <p className="text-xs text-muted-foreground">Waiting on employee</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {assignment.isOverdue ? <Badge variant="destructive">Overdue</Badge> : null}
                  <Badge variant={STATUS_VARIANT[assignment.status]}>{STATUS_LABEL[assignment.status]}</Badge>
                  {assignment.status === "PENDING" && readyForReview ? (
                    <ExitClearanceReviewOverride assignmentId={assignment.id} actingEmployeeId={actingEmployeeId} />
                  ) : null}
                </div>
              </div>
            )
          })}
        </CardContent>
      ) : null}
    </Card>
  )
}
