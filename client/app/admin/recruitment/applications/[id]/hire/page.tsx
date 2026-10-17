import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchApplication, fetchRequisition } from "@/lib/api/recruitment"
import { quickHireCandidate } from "@/lib/api/recruitment-actions"
import { getSession } from "@/lib/get-session"

import { HireForm } from "./hire-form"

export default async function HireCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const applicationResult = await fetchApplication(id, actingEmployeeId)
  if (!applicationResult.ok) {
    if (applicationResult.status === 404) notFound()
    return <p className="text-sm text-destructive">{applicationResult.error}</p>
  }
  const application = applicationResult.data
  const requisitionResult = await fetchRequisition(application.jobPosting.requisition.id, actingEmployeeId)
  const requisition = requisitionResult.ok ? requisitionResult.data : null
  const c = application.candidate

  const startDefault = new Date()
  startDefault.setDate(1)
  startDefault.setMonth(startDefault.getMonth() + 1)
  const iso = (d: Date) => d.toISOString().slice(0, 10)

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href={`/admin/recruitment/applications/${id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to candidate
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          Hire {c.firstName} {c.lastName}
        </h1>
        <p className="text-sm text-muted-foreground">One step: confirm a few details and the employee record is created.</p>
      </div>

      {application.hiredEmployeeNumber ? (
        <Card>
          <CardContent className="py-6 text-sm">
            Already hired as{" "}
            <Link href={`/admin/employees/${application.hiredEmployeeNumber}`} className="text-primary underline">
              {application.hiredEmployeeNumber}
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Already filled in for you</CardTitle>
              <CardDescription>Taken from the candidate&apos;s application and the approved requisition.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Name" value={`${c.firstName} ${c.lastName}`} />
              <Info label="Email" value={c.email} />
              <Info label="Phone" value={c.phone} />
              <Info label="Nationality" value={c.nationality} />
              <Info label="Position" value={requisition?.position.title ?? application.jobPosting.postingTitle} />
              <Info label="Department" value={requisition?.department.name ?? "—"} />
              <Info label="Band" value={requisition?.band.name ?? "—"} />
              <Info label="Branch" value={requisition?.branch.name ?? "—"} />
              <Info label="Contract" value={requisition ? requisition.contractType.replaceAll("_", " ") : "—"} />
              <Info label="Reports to" value={requisition?.reportsToPosition?.title ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details we still need</CardTitle>
            </CardHeader>
            <CardContent>
              <HireForm
                action={quickHireCandidate.bind(null, id, actingEmployeeId)}
                defaultStart={iso(startDefault)}
                isTemporary={requisition?.contractType === "TEMPORARY"}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  )
}
