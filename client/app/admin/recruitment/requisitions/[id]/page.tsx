import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchJobPostings, fetchRequisition, fetchRequisitionStages } from "@/lib/api/recruitment"
import { getSession } from "@/lib/get-session"

import { RequisitionActions } from "./requisition-actions"
import { StageTimeline } from "./stage-timeline"

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

export default async function RequisitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [requisitionResult, stagesResult, postingsResult] = await Promise.all([
    fetchRequisition(id, actingEmployeeId),
    fetchRequisitionStages(id, actingEmployeeId),
    fetchJobPostings({ requisitionId: id }, actingEmployeeId),
  ])

  if (!requisitionResult.ok) {
    if (requisitionResult.status === 404) notFound()
    return (
      <Card className="max-w-4xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{requisitionResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const requisition = requisitionResult.data
  const postings = postingsResult.ok ? postingsResult.data : []

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link
          href="/admin/recruitment/requisitions"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to requisitions
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">{requisition.position.title}</h1>
          <Badge variant={requisition.status === "APPROVED" ? "success" : requisition.status === "REJECTED" ? "destructive" : "outline"}>
            {requisition.status.replaceAll("_", " ")}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Department" value={requisition.department.name} />
          <Field label="Unit" value={requisition.unit?.name ?? "—"} />
          <Field label="Branch" value={requisition.branch.name} />
          <Field label="Band" value={requisition.band.name} />
          <Field label="Vacancies" value={requisition.numberOfVacancies} />
          <Field label="Contract type" value={requisition.contractType.replaceAll("_", " ")} />
          <Field label="Employment type" value={requisition.employmentType.replaceAll("_", " ")} />
          <Field label="Hiring reason" value={requisition.hiringReason.replaceAll("_", " ")} />
          <Field label="Priority" value={requisition.priority} />
          <Field
            label="Target start date"
            value={requisition.targetStartDate ? new Date(requisition.targetStartDate).toLocaleDateString() : "—"}
          />
          <Field label="Requested by" value={`${requisition.requestedBy.firstName} ${requisition.requestedBy.lastName}`} />
          <Field label="Hiring manager" value={`${requisition.hiringManager.firstName} ${requisition.hiringManager.lastName}`} />
          <Field label="Recruiter" value={`${requisition.recruiter.firstName} ${requisition.recruiter.lastName}`} />
          {requisition.jobDescription ? <Field label="Job description" value={requisition.jobDescription.jobTitle} /> : null}
          {requisition.rejectionComment ? <Field label="Rejection reason" value={requisition.rejectionComment} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <RequisitionActions
            requisitionId={requisition.id}
            actingEmployeeId={actingEmployeeId}
            status={requisition.status}
            isAdmin={session?.role === "admin"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recruitment timeline</CardTitle>
          <CardDescription>Planned vs. actual dates for each stage. Stages past their planned end without completing are flagged Delayed.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {stagesResult.ok ? (
            <StageTimeline stages={stagesResult.data} requisitionId={requisition.id} actingEmployeeId={actingEmployeeId} />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">Couldn&apos;t load the timeline.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Job postings</CardTitle>
            <CardDescription>Postings created against this requisition.</CardDescription>
          </div>
          {requisition.status === "APPROVED" ? (
            <Link
              href={`/admin/recruitment/job-postings/new?requisitionId=${requisition.id}`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              New job posting
            </Link>
          ) : null}
        </CardHeader>
        <CardContent>
          {postings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No job postings yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {postings.map((posting) => (
                <li key={posting.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">
                    {posting.postingTitle} · {posting._count.applications} application(s)
                  </span>
                  <Link href={`/admin/recruitment/job-postings/${posting.id}`} className="text-xs font-medium text-primary hover:underline">
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
