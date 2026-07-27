import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmployees, formatEnumLabel } from "@/lib/api/employees"
import { fetchRatingScale, fetchReview, REVIEW_STATUS_LABELS, REVIEW_TYPE_LABELS } from "@/lib/api/performance"
import { getSession } from "@/lib/get-session"

import { AcknowledgeForm } from "../../../../admin/performance/reviews/[id]/acknowledge-form"
import { AuditLogList } from "../../../../admin/performance/reviews/[id]/audit-log-list"
import { FinalizeForm } from "../../../../admin/performance/reviews/[id]/finalize-form"
import { ReassignForm } from "../../../../admin/performance/reviews/[id]/reassign-form"
import { ReviewForm } from "../../../../admin/performance/reviews/[id]/review-form"
import { SubmitButton } from "../../../../admin/performance/reviews/[id]/submit-button"

const STATUS_VARIANT: Record<string, "outline" | "secondary" | "success" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  ACKNOWLEDGED: "secondary",
  FINALIZED: "success",
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  )
}

export default async function StaffReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [reviewResult, ratingScaleResult, employeesResult] = await Promise.all([
    fetchReview(id, actingEmployeeId),
    fetchRatingScale(),
    fetchEmployees(false),
  ])

  if (!reviewResult.ok) {
    if (reviewResult.status === 404) notFound()
    return (
      <Card className="max-w-2xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t load this review</CardTitle>
          <CardDescription>{reviewResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const review = reviewResult.data
  const ratingScale = ratingScaleResult.ok ? ratingScaleResult.data : []
  const employees = employeesResult.ok ? employeesResult.data : []
  const ratingLabel = ratingScale.find((entry) => entry.rank === review.overallRating)?.label

  const isAdmin = session?.role === "admin"
  const isReviewer = session?.employeeId === review.reviewer?.employeeNumber
  const isSubject = session?.employeeId === review.employee.employeeNumber
  const canEdit = (isAdmin || isReviewer) && (review.status !== "FINALIZED" || isAdmin)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/staff/performance/reviews"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to reviews
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">
            {REVIEW_TYPE_LABELS[review.reviewType]} — {review.employee.firstName} {review.employee.lastName}
          </h1>
          <Badge variant={STATUS_VARIANT[review.status]}>{REVIEW_STATUS_LABELS[review.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{review.period.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employee information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Employee" value={`${review.employee.firstName} ${review.employee.lastName}`} />
          <Field label="Employee number" value={review.employee.employeeNumber} />
          <Field label="Department" value={review.department?.name ?? "—"} />
          <Field label="Unit" value={review.unit?.name ?? "—"} />
          <Field label="Position" value={review.position?.title ?? "—"} />
          <Field label="Band" value={review.band?.name ?? "—"} />
          <Field label="Branch" value={review.branch?.name ?? "—"} />
          <Field
            label="Reviewer"
            value={review.reviewer ? `${review.reviewer.firstName} ${review.reviewer.lastName}` : "Unassigned"}
          />
          <Field label="Review period" value={review.period.name} />
          <Field
            label="Overall rating"
            value={review.overallRating ? `${review.overallRating}/5 — ${ratingLabel ?? ""}` : "Not yet rated"}
          />
        </CardContent>
      </Card>

      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance assessment</CardTitle>
            <CardDescription>Saved automatically as you type.</CardDescription>
          </CardHeader>
          <CardContent>
            <ReviewForm review={review} actingEmployeeId={actingEmployeeId} />
            {review.status === "DRAFT" ? (
              <div className="mt-4 border-t border-border pt-4">
                <SubmitButton reviewId={review.id} actingEmployeeId={actingEmployeeId} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance assessment</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <Field label="Strengths" value={review.strengths || "—"} />
            <Field label="Achievements" value={review.achievements || "—"} />
            <Field label="Areas for improvement" value={review.areasForImprovement || "—"} />
            <Field label="Goals achieved" value={review.goalsAchieved || "—"} />
            <Field label="Goals not achieved" value={review.goalsNotAchieved || "—"} />
            <Field label="Behaviour & competencies" value={review.behaviourCompetencies || "—"} />
            <Field label="Recommended training" value={review.recommendedTraining || "—"} />
            <Field label="Development plan" value={review.developmentPlan || "—"} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <Field label="Manager comments" value={review.managerComments || "—"} />
          <Field label="Employee comments" value={review.employeeComments || "Not yet added"} />
          <Field label="HR comments" value={review.hrComments || "Not yet added"} />
        </CardContent>
      </Card>

      {isSubject && review.status === "SUBMITTED" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acknowledge this review</CardTitle>
            <CardDescription>Optional comments — acknowledging confirms you&apos;ve seen this review.</CardDescription>
          </CardHeader>
          <CardContent>
            <AcknowledgeForm reviewId={review.id} actingEmployeeId={actingEmployeeId} />
          </CardContent>
        </Card>
      ) : null}

      {isAdmin && (review.status === "SUBMITTED" || review.status === "ACKNOWLEDGED") ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Finalize review</CardTitle>
            <CardDescription>Locks this review into permanent history.</CardDescription>
          </CardHeader>
          <CardContent>
            <FinalizeForm reviewId={review.id} actingEmployeeId={actingEmployeeId} />
          </CardContent>
        </Card>
      ) : null}

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reassign reviewer</CardTitle>
          </CardHeader>
          <CardContent>
            <ReassignForm
              reviewId={review.id}
              actingEmployeeId={actingEmployeeId}
              employees={employees}
              currentReviewerId={review.reviewer?.employeeNumber ?? ""}
            />
          </CardContent>
        </Card>
      ) : null}

      {review.contractType || review.gender ? (
        <p className="text-xs text-muted-foreground">
          Snapshot at review time: {review.contractType ? formatEnumLabel(review.contractType) : "—"}
          {review.gender ? ` · ${formatEnumLabel(review.gender)}` : ""}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit log</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditLogList entries={review.auditLogs ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
