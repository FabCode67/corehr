import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchExitDocumentsForEmployee, fetchExitDocumentTypes } from "@/lib/api/exit-documents"
import { bulkAssignExitDocumentsForm } from "@/lib/api/exit-documents-actions"

import { ExitDocumentToggle } from "./exit-document-toggle"

/**
 * Additive HR-facing section, rendered inside ExitProcessSection once the
 * exit process has started. Unlike OnboardingDocumentsSection, there's no
 * upload/review split here — HR (or IT/Facilities/Payroll, acting through
 * HR) just ticks each item off. See schema.prisma's Exit Document
 * Management module note for why this is simpler than onboarding.
 */
export async function ExitDocumentsSection({ employeeId, actingEmployeeId }: { employeeId: string; actingEmployeeId: string }) {
  const [typesResult, assignmentsResult] = await Promise.all([fetchExitDocumentTypes(), fetchExitDocumentsForEmployee(employeeId)])

  const assignments = assignmentsResult.ok ? assignmentsResult.data : []
  const assignedTypeIds = new Set(assignments.map((a) => a.documentTypeId))
  const unassigned = typesResult.ok ? typesResult.data.filter((type) => !assignedTypeIds.has(type.id)) : []

  const total = assignments.length
  const completed = assignments.filter((a) => a.isCompleted).length
  const allCompleted = total > 0 && completed === total

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Exit Documents</CardTitle>
        <CardDescription>
          {total > 0
            ? `${completed} of ${total} completed — every item must be checked off before the exit can be confirmed.`
            : "No exit documents assigned yet."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {total > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${allCompleted ? "bg-emerald-500" : "bg-primary"}`}
                style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
              />
            </div>
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {assignment.documentType.name}
                    {assignment.documentType.isMandatory ? <span className="ml-1 text-xs text-muted-foreground">(mandatory)</span> : null}
                  </p>
                  {assignment.documentType.description ? (
                    <p className="text-xs text-muted-foreground">{assignment.documentType.description}</p>
                  ) : null}
                  {assignment.isCompleted && assignment.completedBy ? (
                    <p className="text-xs text-muted-foreground">
                      Completed by {assignment.completedBy.firstName} {assignment.completedBy.lastName}
                      {assignment.completedAt ? ` on ${new Date(assignment.completedAt).toLocaleDateString()}` : ""}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={assignment.isCompleted ? "success" : "outline"}>{assignment.isCompleted ? "Completed" : "Outstanding"}</Badge>
                  <ExitDocumentToggle
                    assignmentId={assignment.id}
                    employeeId={employeeId}
                    actingEmployeeId={actingEmployeeId}
                    isCompleted={assignment.isCompleted}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {unassigned.length > 0 ? (
          <form action={bulkAssignExitDocumentsForm.bind(null, employeeId, actingEmployeeId)} className="flex flex-col gap-3 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">Assign more documents</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {unassigned.map((type) => (
                <label key={type.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="documentTypeIds" value={type.id} defaultChecked={type.isMandatory} className="size-3.5 rounded border-input" />
                  {type.name}
                  {type.isMandatory ? <span className="text-xs text-muted-foreground">(mandatory)</span> : null}
                </label>
              ))}
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" variant="outline">
                Assign selected
              </Button>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  )
}
