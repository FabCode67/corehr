import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchDepartmentEmployee } from "@/lib/api/department-dashboard"
import { formatEnumLabel, type Employee } from "@/lib/api/employees"
import { fullName } from "@/lib/format-name"

import { DepartmentApiError, resolveDepartmentContext } from "../../shared"

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  )
}

export default async function DepartmentEmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>
  searchParams: Promise<{ dept?: string }>
}) {
  const { employeeId } = await params
  const { dept } = await searchParams
  const context = await resolveDepartmentContext(dept)

  if (context.status !== "ok") {
    return (
      <div className="flex flex-col gap-6">
        {context.status === "error" ? <DepartmentApiError message={context.message} /> : null}
        {context.status === "empty" ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              You are not currently set as the Head of a Department.
            </CardContent>
          </Card>
        ) : null}
      </div>
    )
  }

  const employeeResult = await fetchDepartmentEmployee(context.selectedDepartmentId, employeeId, context.actingEmployeeId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/staff/department-dashboard/employees?dept=${context.selectedDepartmentId}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to employees
        </Link>
      </div>

      {!employeeResult.ok ? (
        <DepartmentApiError message={employeeResult.error} />
      ) : (
        <EmployeeDetail employee={employeeResult.data} />
      )}
    </div>
  )
}

function EmployeeDetail({ employee }: { employee: Employee }) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>{fullName(employee)}</CardTitle>
            <Badge variant={employee.isActive ? "success" : "outline"}>{employee.isActive ? "Active" : "Exited"}</Badge>
          </div>
          <CardDescription>{employee.employeeNumber}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Email" value={employee.email} />
          <Field label="Phone" value={employee.phone} />
          <Field label="Position" value={employee.position?.title ?? "Not yet assigned"} />
          <Field label="Unit" value={employee.position?.unit?.name ?? "—"} />
          <Field label="Band" value={employee.band?.name ?? "Not yet assigned"} />
          <Field label="Branch" value={employee.branch?.name ?? "Not yet assigned"} />
          <Field label="Contract type" value={employee.contractType ? formatEnumLabel(employee.contractType) : "Not set"} />
          <Field label="Employment start date" value={employee.employmentStartDate?.slice(0, 10) ?? "—"} />
          <Field label="Gender" value={formatEnumLabel(employee.gender)} />
        </CardContent>
      </Card>
    </div>
  )
}
