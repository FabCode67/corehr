import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import { Select } from "@/components/ui/select"
import { fetchBranches } from "@/lib/api/branches"
import { fetchDepartments } from "@/lib/api/departments"
import {
  fetchReviewPeriods,
  fetchReviewsPaginated,
  REVIEW_STATUS_LABELS,
  REVIEW_TYPE_LABELS,
} from "@/lib/api/performance"
import { getSession } from "@/lib/get-session"

import { PerformanceTabs } from "../performance-tabs"

const STATUS_VARIANT: Record<string, "outline" | "secondary" | "success" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  ACKNOWLEDGED: "secondary",
  FINALIZED: "success",
}

interface SearchParams {
  [key: string]: string | undefined
  periodId?: string
  reviewType?: string
  status?: string
  departmentId?: string
  branchId?: string
  page?: string
}

export default async function AdminPerformanceReviewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const filters = await searchParams
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [reviewsResult, periodsResult, departmentsResult, branchesResult] = await Promise.all([
    fetchReviewsPaginated(
      {
        periodId: filters.periodId,
        reviewType: filters.reviewType as "MID_YEAR" | "ANNUAL" | undefined,
        status: filters.status,
        departmentId: filters.departmentId,
        branchId: filters.branchId,
      },
      actingEmployeeId,
      filters.page ? Number(filters.page) : 1
    ),
    fetchReviewPeriods(),
    fetchDepartments(),
    fetchBranches(),
  ])

  const periods = periodsResult.ok ? periodsResult.data : []
  const departments = departmentsResult.ok ? departmentsResult.data : []
  const branches = branchesResult.ok ? branchesResult.data : []
  const reviews = reviewsResult.ok ? reviewsResult.data.data : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Performance Management</h1>
          <p className="text-sm text-muted-foreground">
            {session?.role === "admin"
              ? "All performance reviews across the bank."
              : "Reviews you can access — your own, your direct reports', and your department."}
          </p>
        </div>
        <Link href="/admin/performance/reviews/new" className={buttonVariants({ size: "sm" })}>
          New review
        </Link>
      </div>

      <PerformanceTabs />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Review period</label>
              <Select name="periodId" defaultValue={filters.periodId ?? ""} className="w-40">
                <option value="">All periods</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Review type</label>
              <Select name="reviewType" defaultValue={filters.reviewType ?? ""} className="w-40">
                <option value="">Any type</option>
                <option value="MID_YEAR">Mid-Year</option>
                <option value="ANNUAL">Annual</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select name="status" defaultValue={filters.status ?? ""} className="w-40">
                <option value="">Any status</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="FINALIZED">Finalized</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Department</label>
              <Select name="departmentId" defaultValue={filters.departmentId ?? ""} className="w-40">
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Branch</label>
              <Select name="branchId" defaultValue={filters.branchId ?? ""} className="w-40">
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </Select>
            </div>
            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

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
            No reviews match these filters.
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
                  <th className="px-4 py-3 font-medium">Reviewer</th>
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
                      {review.reviewer ? `${review.reviewer.firstName} ${review.reviewer.lastName}` : "Unassigned"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {review.overallRating ? `${review.overallRating}/5` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[review.status]}>{REVIEW_STATUS_LABELS[review.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/performance/reviews/history/${review.employee.employeeNumber}`}
                          className="text-xs font-medium text-muted-foreground hover:underline"
                        >
                          History
                        </Link>
                        <Link
                          href={`/admin/performance/reviews/${review.id}`}
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
              basePath="/admin/performance/reviews"
              searchParams={filters}
            />
          ) : null}
        </Card>
      )}
    </div>
  )
}
