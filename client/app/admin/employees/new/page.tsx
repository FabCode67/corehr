import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchBands } from "@/lib/api/bands"
import { fetchPositions } from "@/lib/api/positions"

import { createEmployee } from "../actions"
import { EmployeeForm } from "../employee-form"

export default async function NewEmployeePage() {
  const [positionsResult, bandsResult] = await Promise.all([fetchPositions(), fetchBands()])

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/admin/employees"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to employees
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New employee</h1>
      </div>

      {!positionsResult.ok || !bandsResult.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>
              {!positionsResult.ok ? positionsResult.error : !bandsResult.ok ? bandsResult.error : null}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <EmployeeForm
              positions={positionsResult.data.filter((position) => position.isActive)}
              bands={bandsResult.data.filter((band) => band.isActive)}
              action={createEmployee}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
