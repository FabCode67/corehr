import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchReviewHistory, REVIEW_STATUS_LABELS, REVIEW_TYPE_LABELS } from "@/lib/api/performance"

/**
 * Full-profile Performance section for the admin Employee Detail page —
 * complete review history for this employee. ReviewsService.historyForEmployee()
 * resolves PerformanceAccessService's scope with allowAll for isAdmin, so an
 * HR admin always sees every review here, not just their own department's.
 */
export async function PerformanceHistorySection({ employeeId, actingEmployeeId }: { employeeId: string; actingEmployeeId: string }) {
  const result = await fetchReviewHistory(employeeId, actingEmployeeId)

  if (!result.ok) {
    if (result.status === 403) return null
    return (
      <Card className="border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Performance</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (result.data.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Performance</CardTitle>
        <CardDescription>Review history, most recent first.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {result.data.map((review) => (
          <div key={review.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm">
            <span>
              {review.period.name} ({review.period.year}) · {REVIEW_TYPE_LABELS[review.reviewType]}
            </span>
            <span className="flex items-center gap-2">
              {review.overallRating !== null ? <Badge variant="secondary">Rating {review.overallRating}</Badge> : null}
              <Badge variant="outline">{REVIEW_STATUS_LABELS[review.status]}</Badge>
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
