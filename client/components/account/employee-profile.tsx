import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmployee, formatEnumLabel } from "@/lib/api/employees"

import { ChangePasswordForm } from "./change-password-form"

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  )
}

export async function EmployeeProfile({ employeeId }: { employeeId: string }) {
  const result = await fetchEmployee(employeeId)

  if (!result.ok) {
    return (
      <Card className="border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const employee = result.data

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Employment details</CardTitle>
          <CardDescription>{employee.employeeNumber}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Full name" value={`${employee.firstName} ${employee.lastName}`} />
          <Field label="Email" value={employee.email} />
          <Field label="Phone" value={employee.phone} />
          <Field label="Position" value={employee.position?.title ?? "Not yet assigned"} />
          <Field
            label="Department"
            value={employee.position?.unit?.name ?? employee.position?.department.name ?? "Not yet assigned"}
          />
          <Field label="Band" value={employee.band?.name ?? "Not yet assigned"} />
          <Field label="Branch" value={formatEnumLabel(employee.workLocation)} />
          <Field
            label="Contract type"
            value={employee.contractType ? formatEnumLabel(employee.contractType) : "Not set"}
          />
          <Field label="Status" value={employee.employmentStatus === "ACTIVE" ? "Active" : "Exit"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            New accounts start with the default password — change it here any time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm employeeId={employee.id} />
        </CardContent>
      </Card>
    </div>
  )
}
