import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchBranch } from "@/lib/api/branches"

import { updateBranch } from "../actions"
import { BranchForm } from "../branch-form"
import { fetchEmployeesPaginated } from "@/lib/api/employees"

export default async function EditBranchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await fetchBranch(id)

  if (!result.ok) {
    if (result.status === 404) {
      notFound()
    }

    return (
      <Card className="max-w-xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const branch = result.data

  // Server-rendered employees list for this branch (first page)
  const employeesResult = await fetchEmployeesPaginated({ branchId: id, page: 1, pageSize: 50 })

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
          <CardDescription>Server-rendered list of employees assigned to this branch.</CardDescription>
        </CardHeader>
        <CardContent>
          {!employeesResult.ok ? (
            <p className="text-sm text-muted-foreground">{employeesResult.error}</p>
          ) : employeesResult.data.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No employees assigned to this location.</p>
          ) : (
            <ul className="grid gap-2">
              {employeesResult.data.data.map((e) => (
                <li key={e.employeeNumber} className="flex items-center justify-between">
                  <Link href={`/admin/employees/${e.employeeNumber}`} className="font-medium hover:underline">
                    {e.preferredName || e.firstName} {e.lastName}
                  </Link>
                  <span className="text-sm text-muted-foreground">{e.employeeNumber}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
