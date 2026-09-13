import Link from "next/link"
import { Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatEnumLabel } from "@/lib/api/employees"
import { fetchRequisitions } from "@/lib/api/recruitment"

import { DepartmentApiError, DepartmentEmptyState, DepartmentSwitcher, resolveDepartmentContext } from "../shared"
import { DepartmentDashboardTabs } from "../tabs"

export default async function DepartmentRequisitionsPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string; created?: string }>
}) {
  const { dept, created } = await searchParams
  const context = await resolveDepartmentContext(dept)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Department Dashboard</h1>
          <p className="text-sm text-muted-foreground">Job requisitions you&apos;ve created for the department(s) you head.</p>
        </div>
        {context.status === "ok" ? (
          <Link
            href={`/staff/department-dashboard/requisitions/new?dept=${context.selectedDepartmentId}`}
            className={buttonVariants({ size: "sm" })}
          >
            <Plus className="mr-1.5 size-4" />
            New requisition
          </Link>
        ) : null}
      </div>

      {context.status === "error" ? <DepartmentApiError message={context.message} /> : null}
      {context.status === "empty" ? <DepartmentEmptyState /> : null}

      {context.status === "ok" ? (
        <>
          <DepartmentDashboardTabs active="requisitions" dept={context.selectedDepartmentId} />
          <DepartmentSwitcher
            departments={context.departments}
            selectedDepartmentId={context.selectedDepartmentId}
            basePath="/staff/department-dashboard/requisitions"
          />

          {created ? (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              Requisition created and submitted into the recruitment approval workflow.
            </div>
          ) : null}

          <RequisitionsTable departmentId={context.selectedDepartmentId} actingEmployeeId={context.actingEmployeeId} />
        </>
      ) : null}
    </div>
  )
}

async function RequisitionsTable({ departmentId, actingEmployeeId }: { departmentId: string; actingEmployeeId: string }) {
  const result = await fetchRequisitions({ departmentId }, actingEmployeeId)
  if (!result.ok) {
    return <DepartmentApiError message={result.error} />
  }

  const requisitions = result.data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Requisitions</CardTitle>
        <CardDescription>{requisitions.length} requisition{requisitions.length === 1 ? "" : "s"}.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
              <th className="px-3 py-2">Position</th>
              <th className="px-3 py-2">Vacancies</th>
              <th className="px-3 py-2">Band</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {requisitions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  No requisitions yet — create one to start the recruitment workflow.
                </td>
              </tr>
            ) : (
              requisitions.map((requisition) => (
                <tr key={requisition.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium text-foreground">{requisition.position.title}</td>
                  <td className="px-3 py-2 text-muted-foreground">{requisition.numberOfVacancies}</td>
                  <td className="px-3 py-2 text-muted-foreground">{requisition.band.name}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline">{formatEnumLabel(requisition.status)}</Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{requisition.createdAt.slice(0, 10)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
