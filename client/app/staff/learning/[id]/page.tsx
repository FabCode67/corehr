import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ASSIGNMENT_STATUS_LABELS, DELIVERY_METHOD_LABELS, PRIORITY_LABELS, fetchAssignment } from "@/lib/api/learning"
import { getSession } from "@/lib/get-session"

import { AuditLogList } from "../../../admin/learning/assignments/[id]/audit-log-list"
import { CertificateForm } from "../../../admin/learning/assignments/[id]/certificate-form"
import { LifecycleActions } from "../../../admin/learning/assignments/[id]/lifecycle-actions"

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

export default async function StaffAssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const result = await fetchAssignment(id, actingEmployeeId)

  if (!result.ok) {
    if (result.status === 404) notFound()
    return (
      <Card className="max-w-2xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t load this course</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const assignment = result.data
  const isAssignee = session?.employeeId === assignment.employee.employeeNumber
  const overdue =
    assignment.dueDate && new Date(assignment.dueDate) < new Date() && !["VERIFIED", "CLOSED"].includes(assignment.status)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/staff/learning"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to My Learning
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">{assignment.course.name}</h1>
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
          <CardTitle className="text-base">Course details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Category" value={assignment.categoryName} />
          <Field label="Due date" value={assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "—"} />
          <Field label="Priority" value={PRIORITY_LABELS[assignment.priority]} />
          <Field
            label="Assigned by"
            value={assignment.assignedBy ? `${assignment.assignedBy.firstName} ${assignment.assignedBy.lastName}` : "System (auto-hire)"}
          />
        </CardContent>
      </Card>

      {assignment.course.description ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{assignment.course.description}</p>
          </CardContent>
        </Card>
      ) : null}

      {assignment.recommendationComment || assignment.reasonForAssignment ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes from HR / your manager</CardTitle>
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
          <CardTitle className="text-base">Your progress</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LifecycleActions
            assignmentId={assignment.id}
            actingEmployeeId={actingEmployeeId}
            status={assignment.status}
            isAssignee={isAssignee}
            isAdmin={false}
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

          {assignment.certificateUrl ? (
            <p className="text-sm">
              <a href={assignment.certificateUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                View your certificate
              </a>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditLogList entries={assignment.auditLogs ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
