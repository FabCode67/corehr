import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmployee } from "@/lib/api/employees"
import {
  fetchProgression,
  fetchReviewHistory,
  REVIEW_STATUS_LABELS,
  REVIEW_TYPE_LABELS,
  type PerformanceReview,
} from "@/lib/api/performance"
import { getSession } from "@/lib/get-session"

const STATUS_VARIANT: Record<string, "outline" | "secondary" | "success" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  ACKNOWLEDGED: "secondary",
  FINALIZED: "success",
}

export default async function PerformanceHistoryPage({
  params,
}: {
  params: Promise<{ employeeId: string }>
}) {
  const { employeeId } = await params
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [employeeResult, historyResult, progressionResult] = await Promise.all([
    fetchEmployee(employeeId),
    fetchReviewHistory(employeeId, actingEmployeeId),
    fetchProgression(employeeId),
  ])

  const employee = employeeResult.ok ? employeeResult.data : null
  const history = historyResult.ok ? historyResult.data : []
  const progression = progressionResult.ok ? progressionResult.data : []
  const [current, ...previous] = history

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/performance/reviews"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to reviews
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          Performance history{employee ? ` — ${employee.firstName} ${employee.lastName}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Every review is retained permanently — nothing here is ever overwritten.
        </p>
      </div>

      {!historyResult.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t load history</CardTitle>
            <CardDescription>{historyResult.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rating trend</CardTitle>
              <CardDescription>Performance progression across every completed cycle.</CardDescription>
            </CardHeader>
            <CardContent>
              {progression.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No rated reviews yet.</p>
              ) : (
                <div className="flex items-end gap-3">
                  {progression.map((point, index) => (
                    <div key={`${point.year}-${point.reviewType}-${index}`} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex h-28 w-full items-end">
                        <div
                          className="w-full rounded-t bg-primary"
                          style={{ height: `${Math.max(4, (point.rating / 5) * 100)}%` }}
                          title={`${point.rating}/5`}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground">{point.rating}/5</span>
                      <span className="text-[0.65rem] text-muted-foreground">
                        {point.year} · {REVIEW_TYPE_LABELS[point.reviewType].replace(" Review", "")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {current ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current review</CardTitle>
              </CardHeader>
              <CardContent>
                <ReviewRow review={current} />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Previous reviews</CardTitle>
            </CardHeader>
            {previous.length === 0 ? (
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                No previous reviews on record.
              </CardContent>
            ) : (
              <CardContent className="flex flex-col divide-y divide-border">
                {previous.map((review) => (
                  <div key={review.id} className="py-3 first:pt-0 last:pb-0">
                    <ReviewRow review={review} />
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

function ReviewRow({ review }: { review: PerformanceReview }) {
  return (
    <Link
      href={`/admin/performance/reviews/${review.id}`}
      className="flex items-center justify-between gap-3 hover:opacity-80"
    >
      <div>
        <p className="text-sm font-medium text-foreground">
          {review.period.name} · {REVIEW_TYPE_LABELS[review.reviewType]}
        </p>
        <p className="text-xs text-muted-foreground">
          Reviewer: {review.reviewer ? `${review.reviewer.firstName} ${review.reviewer.lastName}` : "Unassigned"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={STATUS_VARIANT[review.status]}>{REVIEW_STATUS_LABELS[review.status]}</Badge>
        <span className="w-10 text-right text-sm font-medium text-foreground">
          {review.overallRating ? `${review.overallRating}/5` : "—"}
        </span>
      </div>
    </Link>
  )
}
