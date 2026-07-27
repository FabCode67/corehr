import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmployees } from "@/lib/api/employees"
import { fetchGrievance, formatErEnum, GRIEVANCE_STATUS_LABELS, type GrievanceStatus } from "@/lib/api/employee-relations"
import { getSession } from "@/lib/get-session"

import { GrievanceActions } from "./grievance-actions"

const STATUS_VARIANT: Record<GrievanceStatus, "outline" | "success" | "secondary" | "destructive" | "default"> = {
  SUBMITTED: "outline",
  UNDER_REVIEW: "default",
  RESOLVED: "success",
  CLOSED: "secondary",
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

export default async function GrievanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [grievanceResult, employeesResult] = await Promise.all([fetchGrievance(id, actingEmployeeId), fetchEmployees()])

  if (!grievanceResult.ok) {
    if (grievanceResult.status === 404 || grievanceResult.status === 403) notFound()
    return (
      <Card className="max-w-2xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{grievanceResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const grievance = grievanceResult.data
  const isHr = session?.role === "admin"
  const hrEmployees = employeesResult.ok ? employeesResult.data.filter((employee) => employee.isAdmin) : []

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/admin/employee-relations/grievances" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to grievances
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-foreground">{grievance.grievanceNumber}</h1>
          <Badge variant={STATUS_VARIANT[grievance.status]}>{GRIEVANCE_STATUS_LABELS[grievance.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{grievance.subject}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Employee" value={`${grievance.employee.firstName} ${grievance.employee.lastName}`} />
          <Field label="Category" value={formatErEnum(grievance.category)} />
          <Field label="Date submitted" value={new Date(grievance.dateSubmitted).toLocaleDateString()} />
          <Field label="Assigned to" value={grievance.assignedTo ? `${grievance.assignedTo.firstName} ${grievance.assignedTo.lastName}` : "Unassigned"} />
          <div className="sm:col-span-2">
            <Field label="Description" value={grievance.description} />
          </div>
          {grievance.resolutionComments ? (
            <div className="sm:col-span-2">
              <Field label="Resolution comments" value={grievance.resolutionComments} />
            </div>
          ) : null}
          {grievance.resolvedAt ? <Field label="Resolved on" value={new Date(grievance.resolvedAt).toLocaleDateString()} /> : null}
        </CardContent>
      </Card>

      {isHr ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manage this grievance</CardTitle>
          </CardHeader>
          <CardContent>
            <GrievanceActions
              grievanceId={grievance.id}
              actingEmployeeId={actingEmployeeId}
              currentStatus={grievance.status}
              currentAssignedToId={grievance.assignedTo?.employeeNumber ?? null}
              hrEmployees={hrEmployees}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
