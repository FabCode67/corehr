import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchExitFormStatus, type Employee, type FormInstanceStatus } from "@/lib/api/employees"

import { initiateExitForm } from "../actions"
import { ExitDocumentsSection } from "./exit-documents-section"

const STATUS_LABELS: Record<FormInstanceStatus, string> = {
  DRAFT: "Draft",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  PENDING_SIGNATURES: "Pending Signatures",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
}

const STATUS_VARIANT: Record<FormInstanceStatus, "outline" | "success" | "secondary" | "destructive" | "default"> = {
  DRAFT: "outline",
  ASSIGNED: "outline",
  IN_PROGRESS: "default",
  SUBMITTED: "default",
  PENDING_SIGNATURES: "default",
  REJECTED: "destructive",
  COMPLETED: "success",
  ARCHIVED: "secondary",
}

/**
 * Additive HR-facing section, same pattern as OnboardingDocumentsSection —
 * lets HR start the Exit Management process (which auto-assigns the Exit
 * Clearance Form via ExitProcessService.initiateExit() on the backend) and
 * tracks that form's progress. Deliberately separate from ExitDialog
 * (processExit) — starting the process here doesn't block or replace the
 * existing finalize-exit flow, per the spec's "no hard gate" design.
 */
export async function ExitProcessSection({ employee, actingEmployeeId }: { employee: Employee; actingEmployeeId: string }) {
  if (employee.employmentStatus !== "ACTIVE") return null

  if (!employee.exitInitiatedAt) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exit Management</CardTitle>
          <CardDescription>Starts the exit process — auto-assigns the Exit Clearance Form and notifies the employee, their line manager, and HR.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={initiateExitForm.bind(null, employee.employeeNumber, actingEmployeeId)}>
            <Button type="submit" variant="outline" size="sm">
              Start exit process
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  const statusResult = await fetchExitFormStatus(employee.employeeNumber)
  const instance = statusResult.ok ? statusResult.data : null

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exit Management</CardTitle>
          <CardDescription>Started {new Date(employee.exitInitiatedAt).toLocaleDateString()} — track the Exit Clearance Form below before finalizing exit clearance.</CardDescription>
        </CardHeader>
        <CardContent>
          {instance ? (
            <div className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <div>
                <p className="font-medium text-foreground">{instance.formTemplate.title}</p>
                <p className="text-xs text-muted-foreground">
                  Assigned {new Date(instance.assignmentDate).toLocaleDateString()}
                  {instance.submittedAt ? ` · Submitted ${new Date(instance.submittedAt).toLocaleDateString()}` : ""}
                  {instance.completedAt ? ` · Completed ${new Date(instance.completedAt).toLocaleDateString()}` : ""}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[instance.status]}>{STATUS_LABELS[instance.status]}</Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No Exit Clearance Form was assigned — the template may not be configured yet.</p>
          )}
        </CardContent>
      </Card>

      <ExitDocumentsSection employeeId={employee.employeeNumber} actingEmployeeId={actingEmployeeId} />
    </div>
  )
}
