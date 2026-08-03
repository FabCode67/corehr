import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import {
  computeTenure,
  computeTotalBankingExperienceYears,
  fetchEmployeeExportColumns,
  fetchEmployeesPaginated,
  fetchLineManagersBatch,
  formatTenure,
} from "@/lib/api/employees"
import { getSession } from "@/lib/get-session"

import { ImportManager } from "../imports/import-manager"
import { ExportColumnsDialog } from "./export-columns-dialog"

const STATUS_VARIANT: Record<string, "success" | "destructive"> = {
  ACTIVE: "success",
  EXIT: "destructive",
}

interface SearchParams {
  page?: string
}

export default async function AdminEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { page } = await searchParams

  // Employee records are never deleted — exited employees stay visible
  // (with a status badge) for historical reporting, per the spec.
  const [result, lineManagersResult, session, exportColumnsResult] = await Promise.all([
    fetchEmployeesPaginated({ includeInactive: true, page: page ? Number(page) : 1 }),
    fetchLineManagersBatch(),
    getSession(),
    fetchEmployeeExportColumns(),
  ])
  const lineManagers = lineManagersResult.ok ? lineManagersResult.data : {}
  const actingEmployeeId = session?.employeeId ?? ""
  const exportColumns = exportColumnsResult.ok ? exportColumnsResult.data : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Employees</h1>
          <p className="text-sm text-muted-foreground">
            Employee registration, position assignment, and band tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportManager moduleKey="employees" moduleLabel="Employees" actingEmployeeId={actingEmployeeId} />
          {exportColumns.length > 0 ? <ExportColumnsDialog columns={exportColumns} /> : null}
          <Link href="/admin/employees/new" className={buttonVariants({ size: "sm" })}>
            New employee
          </Link>
        </div>
      </div>

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : result.data.data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No employees yet.{" "}
            <Link href="/admin/employees/new" className="text-primary underline">
              Add the first one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Position</th>
                  <th className="px-4 py-3 font-medium">Department / Unit</th>
                  <th className="px-4 py-3 font-medium">Band</th>
                  <th className="px-4 py-3 font-medium">Line Manager</th>
                  <th className="px-4 py-3 font-medium">Tenure</th>
                  <th className="px-4 py-3 font-medium">Banking Experience</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.data.data.map((employee) => (
                  <tr key={employee.employeeNumber} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{employee.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {employee.position?.title ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {employee.position?.unit?.name ?? employee.position?.department.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {employee.band?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lineManagers[employee.employeeNumber] ? (
                        <Link href={`/admin/employees/${lineManagers[employee.employeeNumber]!.id}`} className="hover:text-foreground hover:underline">
                          {lineManagers[employee.employeeNumber]!.firstName} {lineManagers[employee.employeeNumber]!.lastName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatTenure(computeTenure(employee.employmentStartDate))}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {(() => {
                        const total = computeTotalBankingExperienceYears(employee)
                        return total === null ? "—" : `${total} Year${total === 1 ? "" : "s"}`
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[employee.employmentStatus] ?? "destructive"}>
                        {employee.employmentStatus === "ACTIVE" ? "Active" : "Exit"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/employees/${employee.employeeNumber}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={result.data.page}
            totalPages={result.data.totalPages}
            total={result.data.total}
            pageSize={result.data.pageSize}
            basePath="/admin/employees"
          />
        </Card>
      )}
    </div>
  )
}
