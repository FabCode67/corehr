import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchLearningPlan, type CourseAssignmentStatus } from "@/lib/api/learning"
import { ASSIGNMENT_STATUS_LABELS } from "@/lib/api/learning-utils"

const STATUS_VARIANT: Record<CourseAssignmentStatus, "outline" | "secondary" | "success" | "destructive"> = {
  ASSIGNED: "outline",
  ACCEPTED: "secondary",
  IN_PROGRESS: "secondary",
  COMPLETED_BY_EMPLOYEE: "secondary",
  PENDING_VERIFICATION: "secondary",
  VERIFIED: "success",
  REJECTED: "destructive",
  CLOSED: "success",
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

/**
 * Full-profile Learning section for the admin Employee Detail page — training
 * assignments bucketed by status (LearningAccessService grants isAdmin
 * allowAll, so every assignment shows regardless of department scope).
 */
export async function LearningSection({ employeeId, actingEmployeeId }: { employeeId: string; actingEmployeeId: string }) {
  const result = await fetchLearningPlan(employeeId, actingEmployeeId)

  if (!result.ok) {
    if (result.status === 403) return null
    return (
      <Card className="border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Learning</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const { assigned, completed, overdue, inProgress } = result.data
  const all = [...overdue, ...inProgress, ...assigned, ...completed].filter(
    (assignment, index, list) => list.findIndex((other) => other.id === assignment.id) === index
  )
  if (all.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Learning</CardTitle>
        <CardDescription>Course assignments and completion status.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border p-3">
            <p className="text-lg font-semibold text-foreground">{completed.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-lg font-semibold text-foreground">{inProgress.length}</p>
            <p className="text-xs text-muted-foreground">In progress</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-lg font-semibold text-foreground">{assigned.length}</p>
            <p className="text-xs text-muted-foreground">Assigned</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-lg font-semibold text-destructive">{overdue.length}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {all.slice(0, 10).map((assignment) => (
            <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm">
              <span>
                {assignment.course.name}
                {assignment.dueDate ? ` · Due ${formatDate(assignment.dueDate)}` : ""}
              </span>
              <Badge variant={STATUS_VARIANT[assignment.status]}>{ASSIGNMENT_STATUS_LABELS[assignment.status]}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
