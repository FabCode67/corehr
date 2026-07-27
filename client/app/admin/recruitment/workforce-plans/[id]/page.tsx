import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchWorkforcePlan, fetchRequisitions } from "@/lib/api/recruitment"
import { getSession } from "@/lib/get-session"

import { PlanActions } from "./plan-actions"

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

export default async function WorkforcePlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [planResult, requisitionsResult] = await Promise.all([
    fetchWorkforcePlan(id, actingEmployeeId),
    fetchRequisitions({}, actingEmployeeId),
  ])

  if (!planResult.ok) {
    if (planResult.status === 404) notFound()
    return (
      <Card className="max-w-3xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{planResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const plan = planResult.data
  const linkedRequisitions = requisitionsResult.ok
    ? requisitionsResult.data.filter((requisition) => requisition.workforcePlanId === plan.id)
    : []

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/admin/recruitment/workforce-plans"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to workforce plans
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">{plan.title}</h1>
          <Badge variant={plan.status === "APPROVED" ? "success" : plan.status === "REJECTED" ? "destructive" : "outline"}>
            {plan.status.replaceAll("_", " ")}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Department" value={plan.department.name} />
          <Field label="Unit" value={plan.unit?.name ?? "—"} />
          <Field label="Branch" value={plan.branch.name} />
          <Field label="Number of positions" value={plan.numberOfPositions} />
          <Field label="Employment type" value={plan.employmentType.replaceAll("_", " ")} />
          <Field label="Priority" value={plan.priority} />
          <Field label="Expected hiring date" value={plan.expectedHiringDate ? new Date(plan.expectedHiringDate).toLocaleDateString() : "—"} />
          <Field label="Budget" value={plan.budget != null ? `RWF ${plan.budget.toLocaleString()}` : "—"} />
          <Field label="Hiring manager" value={`${plan.hiringManager.firstName} ${plan.hiringManager.lastName}`} />
          <Field label="Recruiter" value={`${plan.recruiter.firstName} ${plan.recruiter.lastName}`} />
          {plan.approvedBy ? <Field label="Approved by" value={`${plan.approvedBy.firstName} ${plan.approvedBy.lastName}`} /> : null}
          {plan.rejectionComment ? <Field label="Rejection reason" value={plan.rejectionComment} /> : null}
          <div className="sm:col-span-2">
            <Field label="Business justification" value={plan.businessJustification} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanActions planId={plan.id} actingEmployeeId={actingEmployeeId} status={plan.status} isAdmin={session?.role === "admin"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Requisitions from this plan</CardTitle>
            <CardDescription>Job requisitions raised against this workforce plan.</CardDescription>
          </div>
          {plan.status === "APPROVED" ? (
            <Link
              href={`/admin/recruitment/requisitions/new?workforcePlanId=${plan.id}`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              New requisition
            </Link>
          ) : null}
        </CardHeader>
        <CardContent>
          {linkedRequisitions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requisitions yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {linkedRequisitions.map((requisition) => (
                <li key={requisition.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">
                    {requisition.position.title} · {requisition.numberOfVacancies} vacancy(ies)
                  </span>
                  <Link
                    href={`/admin/recruitment/requisitions/${requisition.id}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
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
