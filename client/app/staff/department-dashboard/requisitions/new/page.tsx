import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchBands } from "@/lib/api/bands"
import { fetchBranches } from "@/lib/api/branches"
import { createDepartmentRequisition } from "@/lib/api/department-dashboard-actions"
import { fetchDepartmentPositions, fetchEligibleWorkforcePlans } from "@/lib/api/department-dashboard"
import { fetchUnits } from "@/lib/api/departments"
import { fetchPositionLevels } from "@/lib/api/positions"
import { fetchJobDescriptions } from "@/lib/api/recruitment"

import { DepartmentApiError, DepartmentEmptyState, resolveDepartmentContext } from "../../shared"
import { DepartmentRequisitionForm } from "./requisition-form"

export default async function NewDepartmentRequisitionPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>
}) {
  const { dept } = await searchParams
  const context = await resolveDepartmentContext(dept)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={context.status === "ok" ? `/staff/department-dashboard/requisitions?dept=${context.selectedDepartmentId}` : "/staff/department-dashboard"}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to requisitions
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New job requisition</h1>
        <p className="text-sm text-muted-foreground">
          Routed through the standard recruitment approval workflow — HR reviews and approves before it goes live.
        </p>
      </div>

      {context.status === "error" ? <DepartmentApiError message={context.message} /> : null}
      {context.status === "empty" ? <DepartmentEmptyState /> : null}

      {context.status === "ok" ? (
        <RequisitionFormCard departmentId={context.selectedDepartmentId} actingEmployeeId={context.actingEmployeeId} />
      ) : null}
    </div>
  )
}

async function RequisitionFormCard({ departmentId, actingEmployeeId }: { departmentId: string; actingEmployeeId: string }) {
  const [workforcePlansResult, positionsResult, unitsResult, levelsResult, bandsResult, branchesResult, jobDescriptionsResult] =
    await Promise.all([
      fetchEligibleWorkforcePlans(departmentId, actingEmployeeId),
      fetchDepartmentPositions(departmentId, actingEmployeeId),
      fetchUnits(),
      fetchPositionLevels(),
      fetchBands(),
      fetchBranches(),
      fetchJobDescriptions(),
    ])

  if (!workforcePlansResult.ok) return <DepartmentApiError message={workforcePlansResult.error} />
  if (!positionsResult.ok) return <DepartmentApiError message={positionsResult.error} />

  const units = unitsResult.ok ? unitsResult.data.filter((unit) => unit.department.id === departmentId) : []
  const levels = levelsResult.ok ? levelsResult.data : []
  const bands = bandsResult.ok ? bandsResult.data : []
  const branches = branchesResult.ok ? branchesResult.data : []
  const jobDescriptions = jobDescriptionsResult.ok ? jobDescriptionsResult.data : []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Requisition details</CardTitle>
        <CardDescription>Position, band, and hiring details for this department.</CardDescription>
      </CardHeader>
      <CardContent>
        <DepartmentRequisitionForm
          workforcePlans={workforcePlansResult.data}
          positions={positionsResult.data}
          units={units}
          levels={levels}
          bands={bands}
          branches={branches}
          jobDescriptions={jobDescriptions}
          action={createDepartmentRequisition.bind(null, departmentId, actingEmployeeId)}
        />
      </CardContent>
    </Card>
  )
}
