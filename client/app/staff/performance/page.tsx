import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchProgression, fetchReviewHistory, REVIEW_STATUS_LABELS, REVIEW_TYPE_LABELS } from "@/lib/api/performance"
import { getSession } from "@/lib/get-session"

const STATUS_VARIANT: Record<string, "outline" | "secondary" | "success" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  ACKNOWLEDGED: "secondary",
  FINALIZED: "success",
}

export default async function StaffPerformancePage() {
  const session = await getSession()

  if (!session) {
    return (
      <Card className="border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Not signed in</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const [historyResult, progressionResult] = await Promise.all([
    fetchReviewHistory(session.employeeId, session.employeeId),
    fetchProgression(session.employeeId),
  ])

  const history = historyResult.ok ? historyResult.data : []
  const progression = progressionResult.ok ? progressionResult.data : []
  const pendingAcknowledgement = history.filter((review) => review.status === "SUBMITTED")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Performance</h1>
          <p className="text-sm text-muted-foreground">Your reviews, ratings, and performance history.</p>
        </div>
        <Link href="/staff/performance/reviews" className={buttonVariants({ size: "sm", variant: "outline" })}>
          Reviews I can access
        </Link>
      </div>

      {pendingAcknowledgement.length > 0 ? (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">Awaiting your acknowledgement</CardTitle>
            <CardDescription>Open a review below to add comments and acknowledge it.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {pendingAcknowledgement.map((review) => (
              <Link
                key={review.id}
                href={`/staff/performance/reviews/${review.id}`}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40"
              >
                <span>
                  {review.period.name} · {REVIEW_TYPE_LABELS[review.reviewType]}
                </span>
                <span className="text-xs font-medium text-primary">Review &amp; acknowledge →</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rating trend</CardTitle>
          <CardDescription>Your performance progression over time.</CardDescription>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review history</CardTitle>
          <CardDescription>Every review you&apos;ve received, permanently retained.</CardDescription>
        </CardHeader>
        {!historyResult.ok ? (
          <CardContent className="py-6 text-center text-sm text-destructive">{historyResult.error}</CardContent>
        ) : history.length === 0 ? (
          <CardContent className="py-8 text-center text-sm text-muted-foreground">No reviews on record yet.</CardContent>
        ) : (
          <CardContent className="flex flex-col divide-y divide-border">
            {history.map((review) => (
              <Link
                key={review.id}
                href={`/staff/performance/reviews/${review.id}`}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80"
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
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
