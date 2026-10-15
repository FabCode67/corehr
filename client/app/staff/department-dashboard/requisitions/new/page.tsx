import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchBranches } from "@/lib/api/branches"
import { createDepartmentRequisition } from "@/lib/api/department-dashboard-actions"
import { fetchDepartmentPositions } from "@/lib/api/department-dashboard"
import { fetchUnits } from "@/lib/api/departments"
import { fetchPositionLevels } from "@/lib/api/positions"

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
          Fill in the key details. HR reviews it and forwards it to the MD for final approval.
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
  const [positionsResult, unitsResult, levelsResult, branchesResult] =
    await Promise.all([
      fetchDepartmentPositions(departmentId, actingEmployeeId),
      fetchUnits(),
      fetchPositionLevels(),
      fetchBranches(),
    ])

  if (!positionsResult.ok) return <DepartmentApiError message={positionsResult.error} />

  const units = unitsResult.ok ? unitsResult.data.filter((unit) => unit.department.id === departmentId) : []
  const levels = levelsResult.ok ? levelsResult.data : []
  const branches = branchesResult.ok ? branchesResult.data : []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Requisition details</CardTitle>
        <CardDescription>Position, band, and hiring details for this department.</CardDescription>
      </CardHeader>
      <CardContent>
        <DepartmentRequisitionForm
          positions={positionsResult.data}
          units={units}
          levels={levels}
          branches={branches}
          action={createDepartmentRequisition.bind(null, departmentId, actingEmployeeId)}
        />
      </CardContent>
    </Card>
  )
}
