import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ASSIGNMENT_STATUS_LABELS, DELIVERY_METHOD_LABELS, PRIORITY_LABELS, fetchAssignment } from "@/lib/api/learning"
import { getSession } from "@/lib/get-session"

import { AuditLogList } from "./audit-log-list"
import { CertificateForm } from "./certificate-form"
import { LifecycleActions } from "./lifecycle-actions"
import { VerifyForm } from "./verify-form"

const STATUS_VARIANT: Record<string, "outline" | "secondary" | "success" | "destructive"> = {
  ASSIGNED: "outline",
  ACCEPTED: "secondary",
  IN_PROGRESS: "secondary",
  COMPLETED_BY_EMPLOYEE: "secondary",
  PENDING_VERIFICATION: "secondary",
  VERIFIED: "success",
  REJECTED: "destructive",
  CLOSED: "success",
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  )
}

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const result = await fetchAssignment(id, actingEmployeeId)

  if (!result.ok) {
    if (result.status === 404) notFound()
    return (
      <Card className="max-w-2xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t load this assignment</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const assignment = result.data
  const isAdmin = session?.role === "admin"
  const isAssignee = session?.employeeId === assignment.employee.employeeNumber
  const overdue =
    assignment.dueDate && new Date(assignment.dueDate) < new Date() && !["VERIFIED", "CLOSED"].includes(assignment.status)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/learning/assignments"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to assigned courses
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">
            {assignment.course.name} — {assignment.employee.firstName} {assignment.employee.lastName}
          </h1>
          <Badge variant={STATUS_VARIANT[assignment.status]}>{ASSIGNMENT_STATUS_LABELS[assignment.status]}</Badge>
          {assignment.isMandatory ? <Badge variant="destructive">Mandatory</Badge> : null}
          {overdue ? <Badge variant="destructive">Overdue</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {assignment.course.courseCode} · {DELIVERY_METHOD_LABELS[assignment.course.deliveryMethod]}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assignment details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Employee" value={`${assignment.employee.firstName} ${assignment.employee.lastName}`} />
          <Field label="Employee number" value={assignment.employee.employeeNumber} />
          <Field label="Department" value={assignment.department?.name ?? "—"} />
          <Field label="Branch" value={assignment.branch?.name ?? "—"} />
          <Field
            label="Assigned by"
            value={assignment.assignedBy ? `${assignment.assignedBy.firstName} ${assignment.assignedBy.lastName}` : "System (auto-hire)"}
          />
          <Field label="Due date" value={assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "—"} />
          <Field label="Priority" value={PRIORITY_LABELS[assignment.priority]} />
          <Field label="Category" value={assignment.categoryName} />
        </CardContent>
      </Card>

      {assignment.recommendationComment || assignment.reasonForAssignment ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            {assignment.recommendationComment ? (
              <Field label="Recommendation" value={assignment.recommendationComment} />
            ) : null}
            {assignment.reasonForAssignment ? (
              <Field label="Reason for assignment" value={assignment.reasonForAssignment} />
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LifecycleActions
            assignmentId={assignment.id}
            actingEmployeeId={actingEmployeeId}
            status={assignment.status}
            isAssignee={isAssignee}
            isAdmin={isAdmin}
          />

          {isAssignee && (assignment.status === "COMPLETED_BY_EMPLOYEE" || assignment.status === "REJECTED") ? (
            <div className="border-t border-border pt-4">
              {assignment.status === "REJECTED" && assignment.hrVerificationComment ? (
                <p className="mb-3 text-sm text-destructive">
                  Certificate rejected: {assignment.hrVerificationComment}
                </p>
              ) : null}
              <CertificateForm assignmentId={assignment.id} actingEmployeeId={actingEmployeeId} />
            </div>
          ) : null}

          {isAdmin && assignment.status === "PENDING_VERIFICATION" ? (
            <div className="border-t border-border pt-4">
              {assignment.certificateUrl ? (
                <p className="mb-3 text-sm">
                  <a href={assignment.certificateUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                    View submitted certificate
                  </a>
                  {assignment.employeeCertificateComment ? ` — "${assignment.employeeCertificateComment}"` : ""}
                </p>
              ) : null}
              <VerifyForm assignmentId={assignment.id} actingEmployeeId={actingEmployeeId} />
            </div>
          ) : null}

          {assignment.certificateUrl && assignment.status !== "PENDING_VERIFICATION" ? (
            <p className="text-sm">
              <a href={assignment.certificateUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                View certificate
              </a>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit log</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditLogList entries={assignment.auditLogs ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
