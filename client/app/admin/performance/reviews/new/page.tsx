import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmployees } from "@/lib/api/employees"
import { fetchReviewPeriods } from "@/lib/api/performance"
import { getSession } from "@/lib/get-session"

import { PerformanceTabs } from "../../performance-tabs"
import { NewReviewForm } from "./new-review-form"

export default async function NewReviewPage() {
  const session = await getSession()
  const [employeesResult, periodsResult] = await Promise.all([fetchEmployees(false), fetchReviewPeriods()])

  const employees = employeesResult.ok ? employeesResult.data : []
  const periods = periodsResult.ok ? periodsResult.data : []

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
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New performance review</h1>
      </div>

      <PerformanceTabs />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Start a review</CardTitle>
          <CardDescription>
            The reviewer defaults to the employee&apos;s reporting manager unless you set one explicitly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewReviewForm employees={employees} periods={periods} actingEmployeeId={session?.employeeId ?? ""} />
        </CardContent>
      </Card>
    </div>
  )
}
