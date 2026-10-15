import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchRequisition } from "@/lib/api/recruitment"
import { fullName } from "@/lib/format-name"
import { getSession } from "@/lib/get-session"

import { MdApprovalButtons } from "../../md-approval-buttons"

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

export default async function MdRequisitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""
  const result = await fetchRequisition(id, actingEmployeeId)
  if (!result.ok) {
    if (result.status === 404) notFound()
    return <p className="text-sm text-destructive">{result.error}</p>
  }
  const r = result.data
  const awaiting = !!session?.isDirector && (r.status === "PENDING_MD_APPROVAL" || r.status === "PENDING_APPROVAL")

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/staff/md" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to MD dashboard
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">{r.position.title}</h1>
          <Badge variant={r.status === "APPROVED" || r.status === "FILLED" ? "success" : r.status === "REJECTED" ? "destructive" : "outline"}>{r.status.replaceAll("_", " ")}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requisition</CardTitle>
          <CardDescription>Requested by {fullName(r.requestedBy)}, reviewed by HR.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Department" value={r.department.name} />
          <Field label="Branch" value={r.branch.name} />
          <Field label="Vacancies" value={r.numberOfVacancies} />
          <Field label="Band" value={r.band.name} />
          <Field label="Contract type" value={r.contractType.replaceAll("_", " ")} />
          <Field label="Employment type" value={r.employmentType.replaceAll("_", " ")} />
          <Field label="Hiring reason" value={r.hiringReason.replaceAll("_", " ")} />
          <Field label="Priority" value={r.priority} />
          <Field label="Target start" value={r.targetStartDate ? new Date(r.targetStartDate).toLocaleDateString() : "—"} />
          {r.reportsToPosition ? <Field label="Reports to" value={r.reportsToPosition.title} /> : null}
          {r.justification ? (
            <div className="sm:col-span-2">
              <Field label="Justification" value={r.justification} />
            </div>
          ) : null}
          {r.hrComment ? (
            <div className="sm:col-span-2">
              <Field label="HR comment" value={r.hrComment} />
            </div>
          ) : null}
          {r.rejectionComment ? (
            <div className="sm:col-span-2">
              <Field label="Rejection reason" value={r.rejectionComment} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {awaiting ? (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="text-base">Your decision</CardTitle>
          </CardHeader>
          <CardContent>
            <MdApprovalButtons requisitionId={r.id} actingEmployeeId={actingEmployeeId} redirectTo="/staff/md" />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
