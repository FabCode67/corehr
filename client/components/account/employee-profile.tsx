import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmployee, fetchEmployeeHistory, formatEnumLabel } from "@/lib/api/employees"

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
  // Position history is read-only here — the only mutations
  // (assignPosition/transferPosition/changeBand) live on the admin
  // employee detail page, never on any staff-facing route, so there is no
  // "save" action for this section to wire up. Fetched in parallel since
  // it doesn't depend on the employee record itself.
  const [result, historyResult] = await Promise.all([fetchEmployee(employeeId), fetchEmployeeHistory(employeeId)])

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
  const history = historyResult.ok ? historyResult.data : []

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
          <Field label="Branch" value={employee.branch?.name ?? "Not yet assigned"} />
          <Field
            label="Contract type"
            value={employee.contractType ? formatEnumLabel(employee.contractType) : "Not set"}
          />
          <Field label="Status" value={employee.employmentStatus === "ACTIVE" ? "Active" : "Exit"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Career progression</CardTitle>
          <CardDescription>
            Your position and band history, as recorded by HR. View only — contact HR if anything here needs correcting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No position changes on record yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {history.map((entry) => (
                <li key={entry.id} className="flex gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  <div className="text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{formatEnumLabel(entry.changeType)}</Badge>
                      <p className="font-medium text-foreground">{entry.position.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Band {entry.band.name} · from {entry.effectiveFrom.slice(0, 10)}
                      {entry.effectiveTo ? ` to ${entry.effectiveTo.slice(0, 10)}` : " (current)"}
                    </p>
                    {entry.changeReason ? <p className="mt-1 text-xs text-muted-foreground">{entry.changeReason}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
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
          <ChangePasswordForm employeeId={employee.employeeNumber} />
        </CardContent>
      </Card>
    </div>
  )
}
