import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchDepartments } from "@/lib/api/departments"
import type { Employee } from "@/lib/api/employees"
import {
  DOCUMENT_STATUS_BADGE_VARIANT,
  DOCUMENT_STATUS_LABELS,
  fetchApplicableDocumentTypes,
  fetchAssignmentsForEmployee,
} from "@/lib/api/onboarding-documents"
import { bulkAssignDocumentsForm, reviewOnboardingDocumentForm } from "@/lib/api/onboarding-documents-actions"

/**
 * Additive HR-facing section on the employee profile: assign applicable
 * onboarding documents (per the HR-configured applicability rules) and
 * review anything already uploaded. Kept as its own async server component
 * — same pattern as EmployeeRelationsHistory — rather than a wizard step,
 * so it doesn't need to touch RegistrationWizard's existing step/action
 * plumbing at all.
 */
export async function OnboardingDocumentsSection({ employee, actingEmployeeId }: { employee: Employee; actingEmployeeId: string }) {
  const departmentsResult = await fetchDepartments()
  const department = departmentsResult.ok ? departmentsResult.data.find((d) => d.id === employee.position?.department.id) : undefined

  const [applicableResult, assignmentsResult] = await Promise.all([
    fetchApplicableDocumentTypes({
      contractType: employee.contractType,
      functionId: department?.functionId,
      departmentId: employee.position?.department.id,
      positionId: employee.positionId,
      bandId: employee.bandId,
    }),
    fetchAssignmentsForEmployee(employee.employeeNumber, actingEmployeeId),
  ])

  if (!assignmentsResult.ok) {
    if (assignmentsResult.status === 403) return null
    return (
      <Card className="border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Onboarding documents</CardTitle>
          <CardDescription>{assignmentsResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const assignments = assignmentsResult.data
  const assignedTypeIds = new Set(assignments.map((a) => a.documentTypeId))
  const unassigned = applicableResult.ok ? applicableResult.data.filter((type) => !assignedTypeIds.has(type.id)) : []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Onboarding documents</CardTitle>
        <CardDescription>Assigned documents, upload status, and HR review.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {assignments.length > 0 ? (
          <div className="flex flex-col gap-2">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {assignment.documentType.name}
                    {assignment.documentType.isMandatory ? <span className="ml-1 text-xs text-muted-foreground">(mandatory)</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {assignment.fileUrl ? (
                      <a href={assignment.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        View uploaded file
                      </a>
                    ) : (
                      "Not uploaded yet"
                    )}
                    {assignment.reviewComments ? ` · "${assignment.reviewComments}"` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={DOCUMENT_STATUS_BADGE_VARIANT[assignment.status]}>{DOCUMENT_STATUS_LABELS[assignment.status]}</Badge>
                  {assignment.status === "UNDER_REVIEW" ? (
                    <div className="flex gap-1">
                      <form action={reviewOnboardingDocumentForm.bind(null, assignment.id, actingEmployeeId, "APPROVED", employee.employeeNumber, undefined)}>
                        <button type="submit" className="text-xs font-medium text-emerald-600 hover:underline">
                          Approve
                        </button>
                      </form>
                      <form
                        action={reviewOnboardingDocumentForm.bind(
                          null,
                          assignment.id,
                          actingEmployeeId,
                          "RESUBMISSION_REQUIRED",
                          employee.employeeNumber,
                          "Please resubmit this document."
                        )}
                      >
                        <button type="submit" className="text-xs font-medium text-amber-600 hover:underline">
                          Request resubmission
                        </button>
                      </form>
                      <form
                        action={reviewOnboardingDocumentForm.bind(
                          null,
                          assignment.id,
                          actingEmployeeId,
                          "REJECTED",
                          employee.employeeNumber,
                          "Rejected by HR."
                        )}
                      >
                        <button type="submit" className="text-xs font-medium text-destructive hover:underline">
                          Reject
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No onboarding documents assigned yet.</p>
        )}

        {unassigned.length > 0 ? (
          <form action={bulkAssignDocumentsForm.bind(null, employee.employeeNumber, actingEmployeeId)} className="flex flex-col gap-3 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">Assign documents</p>
            <p className="text-xs text-muted-foreground">Applicable to this employee&apos;s profile and not yet assigned.</p>
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
              <Button type="submit" size="sm">
                Assign selected
              </Button>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  )
}
