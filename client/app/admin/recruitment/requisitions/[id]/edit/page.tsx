import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchBands } from "@/lib/api/bands"
import { fetchJobDescriptions, fetchRequisition } from "@/lib/api/recruitment"
import { updateRequisition } from "@/lib/api/recruitment-actions"
import { getSession } from "@/lib/get-session"

import { RequisitionEditForm } from "./requisition-edit-form"

export default async function EditRequisitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [requisitionResult, bandsResult, jobDescriptionsResult] = await Promise.all([
    fetchRequisition(id, actingEmployeeId),
    fetchBands(),
    fetchJobDescriptions(),
  ])

  if (!requisitionResult.ok) {
    if (requisitionResult.status === 404) notFound()
    return (
      <Card className="max-w-3xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{requisitionResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const requisition = requisitionResult.data

  if (requisition.status === "CLOSED") {
    return (
      <Card className="max-w-3xl border-dashed">
        <CardHeader>
          <CardTitle className="text-base">This requisition is closed</CardTitle>
          <CardDescription>
            A closed requisition can no longer be edited. Reopen it first from the{" "}
            <Link href={`/admin/recruitment/requisitions/${id}`} className="text-primary underline">
              requisition page
            </Link>
            .
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href={`/admin/recruitment/requisitions/${id}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to requisition
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Edit job requisition</h1>
        <p className="text-sm text-muted-foreground">{requisition.position.title}</p>
      </div>

      <Card>
        <CardContent>
          <RequisitionEditForm
            requisition={requisition}
            bands={bandsResult.ok ? bandsResult.data : []}
            jobDescriptions={jobDescriptionsResult.ok ? jobDescriptionsResult.data : []}
            action={updateRequisition.bind(null, id, actingEmployeeId)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
