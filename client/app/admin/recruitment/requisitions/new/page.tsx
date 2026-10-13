import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { fetchBranches } from "@/lib/api/branches"
import { fetchDepartments, fetchUnits } from "@/lib/api/departments"
import { fetchPositionLevels, fetchPositions } from "@/lib/api/positions"
import { createRequisition } from "@/lib/api/recruitment-actions"
import { getSession } from "@/lib/get-session"

import { RequisitionForm } from "./requisition-form"

export default async function NewRequisitionPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [positionsResult, departmentsResult, unitsResult, levelsResult, branchesResult] = await Promise.all([
    fetchPositions(),
    fetchDepartments(),
    fetchUnits(),
    fetchPositionLevels(),
    fetchBranches(),
  ])

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
        <p className="text-sm text-muted-foreground">
          Pick a vacant position or propose a new one. HR reviews it, then the Managing Director gives final approval.
        </p>
      </div>

      <Card>
        <CardContent>
          <RequisitionForm
            positions={positionsResult.ok ? positionsResult.data : []}
            departments={departmentsResult.ok ? departmentsResult.data : []}
            units={unitsResult.ok ? unitsResult.data : []}
            levels={levelsResult.ok ? levelsResult.data : []}
            branches={branchesResult.ok ? branchesResult.data : []}
            actingEmployeeId={actingEmployeeId}
            action={createRequisition}
            submitLabel="Save as draft"
          />
        </CardContent>
      </Card>
    </div>
  )
}
