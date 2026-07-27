import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import {
  fetchReviewsPaginated,
  REVIEW_STATUS_LABELS,
  REVIEW_TYPE_LABELS,
} from "@/lib/api/performance"
import { getSession } from "@/lib/get-session"

const STATUS_VARIANT: Record<string, "outline" | "secondary" | "success" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  ACKNOWLEDGED: "secondary",
  FINALIZED: "success",
}

export default async function StaffReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const reviewsResult = await fetchReviewsPaginated({}, actingEmployeeId, page ? Number(page) : 1)
  const reviews = reviewsResult.ok ? reviewsResult.data.data : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reviews I can access</h1>
          <p className="text-sm text-muted-foreground">
            Your own reviews, plus anyone reporting to you and (if you head a department) your department&apos;s
            reviews.
          </p>
        </div>
        <Link href="/staff/performance/reviews/new" className={buttonVariants({ size: "sm" })}>
          New review
        </Link>
      </div>

      {!reviewsResult.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{reviewsResult.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : reviews.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No reviews yet.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Rating</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {review.employee.firstName} {review.employee.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{review.department?.name ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{review.period.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{REVIEW_TYPE_LABELS[review.reviewType]}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {review.overallRating ? `${review.overallRating}/5` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[review.status]}>{REVIEW_STATUS_LABELS[review.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/staff/performance/reviews/history/${review.employee.employeeNumber}`}
                          className="text-xs font-medium text-muted-foreground hover:underline"
                        >
                          History
                        </Link>
                        <Link
                          href={`/staff/performance/reviews/${review.id}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {reviewsResult.ok ? (
            <Pagination
              page={reviewsResult.data.page}
              totalPages={reviewsResult.data.totalPages}
              total={reviewsResult.data.total}
              pageSize={reviewsResult.data.pageSize}
              basePath="/staff/performance/reviews"
            />
          ) : null}
        </Card>
      )}
    </div>
  )
}
