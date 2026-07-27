import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchBands } from "@/lib/api/bands"
import { fetchBranches } from "@/lib/api/branches"
import { fetchDepartments, fetchUnits } from "@/lib/api/departments"
import { fetchEmployees } from "@/lib/api/employees"
import { fetchPositionLevels, fetchPositions } from "@/lib/api/positions"
import { fetchJobDescriptions, fetchWorkforcePlans } from "@/lib/api/recruitment"
import { createRequisition } from "@/lib/api/recruitment-actions"
import { getSession } from "@/lib/get-session"

import { RequisitionForm } from "./requisition-form"

export default async function NewRequisitionPage({ searchParams }: { searchParams: Promise<{ workforcePlanId?: string }> }) {
  const { workforcePlanId } = await searchParams
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [plansResult, positionsResult, departmentsResult, unitsResult, levelsResult, bandsResult, branchesResult, employeesResult, jobDescriptionsResult] =
    await Promise.all([
      fetchWorkforcePlans({ status: "APPROVED" }, actingEmployeeId),
      fetchPositions(),
      fetchDepartments(),
      fetchUnits(),
      fetchPositionLevels(),
      fetchBands(),
      fetchBranches(),
      fetchEmployees(),
      fetchJobDescriptions(),
    ])

  if (!plansResult.ok) {
    return (
      <Card className="max-w-3xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{plansResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/admin/recruitment/requisitions"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to requisitions
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New job requisition</h1>
      </div>

      {plansResult.data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-sm text-muted-foreground">
            No approved workforce plans yet.{" "}
            <Link href="/admin/recruitment/workforce-plans/new" className="text-primary underline">
              Create and approve one first
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <RequisitionForm
              workforcePlans={plansResult.data}
              positions={positionsResult.ok ? positionsResult.data : []}
              departments={departmentsResult.ok ? departmentsResult.data : []}
              units={unitsResult.ok ? unitsResult.data : []}
              levels={levelsResult.ok ? levelsResult.data : []}
              bands={bandsResult.ok ? bandsResult.data : []}
              branches={branchesResult.ok ? branchesResult.data : []}
              employees={employeesResult.ok ? employeesResult.data : []}
              jobDescriptions={jobDescriptionsResult.ok ? jobDescriptionsResult.data : []}
              actingEmployeeId={actingEmployeeId}
              defaultWorkforcePlanId={workforcePlanId}
              action={createRequisition}
              submitLabel="Create requisition"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
