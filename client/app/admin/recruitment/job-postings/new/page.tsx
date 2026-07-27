import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchBranches } from "@/lib/api/branches"
import { fetchRequisitions } from "@/lib/api/recruitment"
import { createJobPosting } from "@/lib/api/recruitment-actions"
import { getSession } from "@/lib/get-session"

import { JobPostingForm } from "./job-posting-form"

export default async function NewJobPostingPage({ searchParams }: { searchParams: Promise<{ requisitionId?: string }> }) {
  const { requisitionId } = await searchParams
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [requisitionsResult, branchesResult] = await Promise.all([
    fetchRequisitions({ status: "APPROVED" }, actingEmployeeId),
    fetchBranches(),
  ])

  if (!requisitionsResult.ok) {
    return (
      <Card className="max-w-3xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{requisitionsResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/admin/recruitment/job-postings"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to job postings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New job posting</h1>
      </div>

      {requisitionsResult.data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-sm text-muted-foreground">No approved requisitions to post yet.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <JobPostingForm
              requisitions={requisitionsResult.data}
              branches={branchesResult.ok ? branchesResult.data : []}
              actingEmployeeId={actingEmployeeId}
              defaultRequisitionId={requisitionId}
              action={createJobPosting}
              submitLabel="Create job posting"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
