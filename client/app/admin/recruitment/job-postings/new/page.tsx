import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchBranches } from "@/lib/api/branches"
import { fetchJobDescriptionStructured, fetchRequisitions } from "@/lib/api/recruitment"
import { createJobPosting } from "@/lib/api/recruitment-actions"
import { getSession } from "@/lib/get-session"
import { splitLines } from "@/lib/jd-content"

import { JobPostingForm } from "./job-posting-form"

export default async function NewJobPostingPage({ searchParams }: { searchParams: Promise<{ requisitionId?: string }> }) {
  const { requisitionId } = await searchParams
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [requisitionsResult, branchesResult] = await Promise.all([
    fetchRequisitions({ status: "APPROVED" }, actingEmployeeId),
    fetchBranches(),
  ])

  // Prefill from the requisition's job description so HR only reviews and publishes.
  const requisition = requisitionsResult.ok ? requisitionsResult.data.find((r) => r.id === requisitionId) : undefined
  const jdResult = requisition?.jobDescriptionId ? await fetchJobDescriptionStructured(requisition.jobDescriptionId) : null
  const jd = jdResult?.ok ? jdResult.data.content : null
  const bullets = (text: string) => splitLines(text).map((l) => l.replace(/^#\s*/, "")).join("\n")
  const defaults = {
    title: requisition?.position.title,
    branchId: requisition?.branchId,
    employmentType: requisition?.employmentType,
    description: jd?.purpose,
    responsibilities: jd?.kras.filter((k) => k.output.trim()).map((k) => `${k.perspective}\n${bullets(k.output)}`).join("\n\n"),
    qualifications: jd ? bullets(jd.specifications) : undefined,
  }

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
        <p className="text-sm text-muted-foreground">Details are prefilled from the requisition and its job description. Publish to get a shareable link.</p>
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
              defaults={defaults}
              action={createJobPosting}
              submitLabel="Create job posting"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
