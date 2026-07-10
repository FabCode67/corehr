import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchDepartment, fetchFunctions } from "@/lib/api/departments"

import { createUnit, deactivateUnit, updateDepartment } from "../actions"
import { DepartmentForm } from "../department-form"
import { AddUnitForm } from "./add-unit-form"

export default async function EditDepartmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [departmentResult, functionsResult] = await Promise.all([
    fetchDepartment(id),
    fetchFunctions(),
  ])

  if (!departmentResult.ok) {
    if (departmentResult.status === 404) {
      notFound()
    }

    return (
      <Card className="max-w-xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{departmentResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const department = departmentResult.data

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/admin/departments"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to departments
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{department.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          {functionsResult.ok ? (
            <DepartmentForm
              functions={functionsResult.data}
              department={department}
              action={updateDepartment.bind(null, department.id)}
              submitLabel="Save changes"
            />
          ) : (
            <p className="text-sm text-destructive">{functionsResult.error}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Units</CardTitle>
          <CardDescription>Optional sub-groupings within this department.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {department.units && department.units.length > 0 ? (
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
              {department.units.map((unit) => (
                <li
                  key={unit.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span className="font-medium text-foreground">{unit.name}</span>
                  <div className="flex items-center gap-3">
                    <Badge variant={unit.isActive ? "success" : "outline"}>
                      {unit.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {unit.isActive ? (
                      <form action={deactivateUnit.bind(null, unit.id, department.id)}>
                        <button
                          type="submit"
                          className="text-xs font-medium text-destructive hover:underline"
                        >
                          Deactivate
                        </button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No units yet — this department&apos;s positions attach directly to it.
            </p>
          )}

          <AddUnitForm action={createUnit.bind(null, department.id)} />
        </CardContent>
      </Card>
    </div>
  )
}
