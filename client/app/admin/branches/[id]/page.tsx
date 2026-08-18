import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchBranch } from "@/lib/api/branches"
import { fetchEmployeesPaginated } from "@/lib/api/employees"

import { updateBranch } from "../actions"
import { BranchForm } from "../branch-form"

export default async function EditBranchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [branchResult, employeesResult] = await Promise.all([
    fetchBranch(id),
    fetchEmployeesPaginated({ branchId: id, page: 1, pageSize: 20, includeInactive: true }),
  ])

  if (!branchResult.ok) {
    if (branchResult.status === 404) {
      notFound()
    }

    return (
      <Card className="max-w-xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{branchResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const branch = branchResult.data
  const employees = employeesResult.ok ? employeesResult.data.data : []

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <Link
          href="/admin/branches"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to locations
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{branch.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
          {branch.isHeadquarters ? (
            <CardDescription>
              This is the headquarters location — it can&apos;t be deactivated. Mark another location as
              headquarters first if you need to retire this one.
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          <BranchForm branch={branch} action={updateBranch.bind(null, branch.id)} submitLabel="Save changes" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employees at this location</CardTitle>
          <CardDescription>
            {employeesResult.ok ? `${employeesResult.data.total} total employee(s)` : "Unable to load the employee list right now."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!employeesResult.ok ? (
            <p className="text-sm text-muted-foreground">{employeesResult.error}</p>
          ) : employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No employees are assigned to this location yet.</p>
          ) : (
            <ul className="space-y-2">
              {employees.map((employee) => (
                <li key={employee.employeeNumber} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {employee.firstName} {employee.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{employee.employeeNumber}</p>
                  </div>
                  <Link href={`/admin/employees/${employee.employeeNumber}`} className="text-xs font-medium text-primary hover:underline">
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
