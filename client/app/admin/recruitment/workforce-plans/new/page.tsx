import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchBranches } from "@/lib/api/branches"
import { fetchDepartments, fetchUnits } from "@/lib/api/departments"
import { fetchEmployees } from "@/lib/api/employees"
import { createWorkforcePlan } from "@/lib/api/recruitment-actions"
import { getSession } from "@/lib/get-session"

import { WorkforcePlanForm } from "./workforce-plan-form"

export default async function NewWorkforcePlanPage() {
  const session = await getSession()
  const [departmentsResult, unitsResult, branchesResult, employeesResult] = await Promise.all([
    fetchDepartments(),
    fetchUnits(),
    fetchBranches(),
    fetchEmployees(),
  ])

  if (!departmentsResult.ok) {
    return (
      <Card className="max-w-3xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{departmentsResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

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
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New workforce plan</h1>
      </div>

      <Card>
        <CardContent>
          <WorkforcePlanForm
            departments={departmentsResult.data}
            units={unitsResult.ok ? unitsResult.data : []}
            branches={branchesResult.ok ? branchesResult.data : []}
            employees={employeesResult.ok ? employeesResult.data : []}
            actingEmployeeId={session?.employeeId ?? ""}
            action={createWorkforcePlan}
            submitLabel="Create workforce plan"
          />
        </CardContent>
      </Card>
    </div>
  )
}
