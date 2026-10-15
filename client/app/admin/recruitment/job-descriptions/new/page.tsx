import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { fetchLatestJobDescriptionForPosition, fetchJobDescriptionStructured, fetchRequisition } from "@/lib/api/recruitment"
import { saveJobDescriptionStructured } from "@/lib/api/recruitment-actions"
import { getSession } from "@/lib/get-session"
import { emptyJdContent, type JdContent } from "@/lib/jd-content"

import { JdEditor } from "../jd-editor"
import { fetchJdLookups } from "../jd-lookups"

/** `?requisitionId=` prefills the header from the requisition's position and
 *  attaches the saved JD to it. `?reuse=1` starts from the latest JD written
 *  for that position; `?from=<jdId>` starts from a specific JD. Either way the
 *  result is saved as a NEW JD, leaving the original untouched. */
export default async function NewJobDescriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ requisitionId?: string; reuse?: string; from?: string }>
}) {
  const { requisitionId, reuse, from } = await searchParams
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const requisitionResult = requisitionId ? await fetchRequisition(requisitionId, actingEmployeeId) : null
  const requisition = requisitionResult?.ok ? requisitionResult.data : null

  let initial: JdContent = emptyJdContent(
    requisition
      ? {
          jobTitle: requisition.position.title,
          reportsTo: requisition.reportsToPosition?.title ?? "",
          supervisor: requisition.reportsToPosition?.title ?? "",
          unit: requisition.unit?.name ?? "",
          division: requisition.department.name,
          grade: requisition.band.name,
        }
      : {}
  )
  let notice: string | undefined

  const source = from
    ? await fetchJobDescriptionStructured(from)
    : reuse && requisition
      ? await fetchLatestJobDescriptionForPosition(requisition.positionId)
      : null
  if (source?.ok && source.data) {
    initial = { ...source.data.content, header: { ...source.data.content.header, date: "", jobHolder: "" } }
    notice = `Started from the existing JD "${source.data.jobTitle}". Customise anything you like — saving creates a new JD and leaves the original unchanged.`
  }

  const lookups = await fetchJdLookups()

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link
          href={requisitionId ? `/admin/recruitment/requisitions/${requisitionId}` : "/admin/recruitment/job-descriptions"}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New job description</h1>
        <p className="text-sm text-muted-foreground">Every section follows the standard NCBA job description layout.</p>
      </div>
      <JdEditor
        lookups={lookups}
        initial={initial}
        notice={notice}
        submitLabel="Save job description"
        action={saveJobDescriptionStructured.bind(null, null, {
          positionId: requisition?.positionId,
          requisitionId,
          actingEmployeeId,
        })}
      />
    </div>
  )
}
