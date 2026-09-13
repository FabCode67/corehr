import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchExitClearanceProgress, type ExitClearanceStatus } from "@/lib/api/exit-clearance"
import { getSession } from "@/lib/get-session"

import { CompleteFormButton } from "./complete-form-button"
import { ExitClearanceTabs } from "./exit-clearance-tabs"

const STATUS_LABEL: Record<ExitClearanceStatus, string> = { PENDING: "Pending", COMPLETED: "Completed", REJECTED: "Returned" }
const STATUS_VARIANT: Record<ExitClearanceStatus, "outline" | "success" | "destructive"> = {
  PENDING: "outline",
  COMPLETED: "success",
  REJECTED: "destructive",
}

/** Employee-facing view of their own Exit Clearance Workflow progress — see
 *  schema.prisma's "EXIT CLEARANCE WORKFLOW" module note. Only ever shows
 *  anything once HR has started the exit process (bulkAssignForExit()); the
 *  nav entry is always shown (same "page handles the empty state"
 *  convention as Team Approvals/Department Dashboard in staff-shell.tsx). */
export default async function StaffExitClearancePage() {
  const session = await getSession()
  const employeeId = session?.employeeId ?? ""

  const progressResult = employeeId ? await fetchExitClearanceProgress(employeeId) : null
  const progress = progressResult?.ok ? progressResult.data : null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Exit Clearance</h1>
        <p className="text-sm text-muted-foreground">Track and complete your part of each exit clearance form.</p>
      </div>

      <ExitClearanceTabs />

      {!progress || progress.total === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Nothing to clear right now</CardTitle>
            <CardDescription>Exit clearance forms appear here once HR starts your exit process.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your clearance progress</CardTitle>
            <CardDescription>
              {progress.completed} of {progress.total} completed
              {progress.rejected > 0 ? ` · ${progress.rejected} returned to you` : ""}
              {progress.overdue > 0 ? ` · ${progress.overdue} overdue` : ""} — every mandatory form must be completed before your exit can be finalized.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${progress.allMandatoryCompleted ? "bg-emerald-500" : "bg-primary"}`}
                style={{ width: `${(progress.completed / progress.total) * 100}%` }}
              />
            </div>
            {progress.assignments.map((assignment) => {
              const canComplete = assignment.template.requiresEmployeeCompletion && assignment.status !== "COMPLETED" && !assignment.employeeCompletedAt
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
                    {assignment.template.description ? <p className="text-xs text-muted-foreground">{assignment.template.description}</p> : null}
                    <p className="text-xs text-muted-foreground">
                      Reviewed by {assignment.template.responsibleDepartment.name} · {assignment.template.responsiblePosition.title}
                    </p>
                    {assignment.status === "REJECTED" && assignment.lastActionComment ? (
                      <p className="text-xs text-destructive">Returned: {assignment.lastActionComment}</p>
                    ) : null}
                    {assignment.status === "PENDING" && assignment.employeeCompletedAt ? (
                      <p className="text-xs text-muted-foreground">Waiting on reviewer</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {assignment.isOverdue ? <Badge variant="destructive">Overdue</Badge> : null}
                    <Badge variant={STATUS_VARIANT[assignment.status]}>{STATUS_LABEL[assignment.status]}</Badge>
                    {canComplete ? <CompleteFormButton assignmentId={assignment.id} employeeId={employeeId} /> : null}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
