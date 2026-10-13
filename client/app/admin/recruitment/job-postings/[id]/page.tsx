import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchApplications, fetchCandidates, fetchJobPosting, fetchPostingSteps, fetchStageDefinitions } from "@/lib/api/recruitment"
import { APPLICATION_STATUS_LABELS } from "@/lib/api/recruitment-utils"
import { ShareJobPanel } from "@/components/share-job-panel"
import { getSession } from "@/lib/get-session"
import { getPublicBaseUrl } from "@/lib/public-url"

import { AddApplicationForm } from "./add-application-form"
import { PostingActions } from "./posting-actions"
import { StepsEditor } from "./steps-editor"
import { buttonVariants } from "@/components/ui/button"

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

export default async function JobPostingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [postingResult, applicationsResult, candidatesResult, stepsResult, catalogResult] = await Promise.all([
    fetchJobPosting(id, actingEmployeeId),
    fetchApplications({ jobPostingId: id }, actingEmployeeId),
    fetchCandidates(),
    fetchPostingSteps(id, actingEmployeeId),
    fetchStageDefinitions(),
  ])

  if (!postingResult.ok) {
    if (postingResult.status === 404) notFound()
    return (
      <Card className="max-w-4xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{postingResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const posting = postingResult.data
  const publicUrl = posting.shareSlug ? `${await getPublicBaseUrl()}/jobs/${posting.shareSlug}` : null
  const applications = applicationsResult.ok ? applicationsResult.data : []
  const candidates = candidatesResult.ok ? candidatesResult.data : []

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link
          href="/admin/recruitment/job-postings"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to job postings
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">{posting.postingTitle}</h1>
          <Badge variant={posting.status === "PUBLISHED" ? "success" : "outline"}>{posting.status}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Position" value={posting.requisition.position.title} />
          <Field label="Branch" value={posting.branch.name} />
          <Field label="Employment type" value={posting.employmentType.replaceAll("_", " ")} />
          <Field label="Closing date" value={new Date(posting.closingDate).toLocaleDateString()} />
          <Field label="Internal" value={posting.isInternal ? "Yes" : "No"} />
          <Field label="External" value={posting.isExternal ? "Yes" : "No"} />
          <div className="sm:col-span-2">
            <Field label="Description" value={posting.description} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <PostingActions postingId={posting.id} actingEmployeeId={actingEmployeeId} status={posting.status} />
        </CardContent>
      </Card>

      {posting.status === "PUBLISHED" && publicUrl ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Share this job</CardTitle>
            <CardDescription>Anyone with this link can view the job and apply — no account needed.</CardDescription>
          </CardHeader>
          <CardContent>
            <ShareJobPanel url={publicUrl} title={posting.postingTitle} />
          </CardContent>
        </Card>
      ) : null}

      {stepsResult.ok && catalogResult.ok ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hiring steps</CardTitle>
            <CardDescription>The interviews, tests and checks every applicant goes through, in order.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <StepsEditor postingId={posting.id} actingEmployeeId={actingEmployeeId} initial={stepsResult.data} catalog={catalogResult.data} />
            <Link href={`/admin/recruitment/job-postings/${posting.id}/board`} className={buttonVariants({ size: "sm", variant: "outline" }) + " self-start"}>
              Open hiring board
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Applications ({applications.length})</CardTitle>
          <CardDescription>Candidates who have applied to this posting.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {posting.status === "PUBLISHED" ? (
            <AddApplicationForm postingId={posting.id} actingEmployeeId={actingEmployeeId} candidates={candidates} />
          ) : null}

          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {applications.map((application) => (
                <li key={application.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="text-foreground">
                    {application.candidate.firstName} {application.candidate.lastName}
                  </span>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{APPLICATION_STATUS_LABELS[application.status]}</Badge>
                    <Link href={`/admin/recruitment/applications/${application.id}`} className="text-xs font-medium text-primary hover:underline">
                      View
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
