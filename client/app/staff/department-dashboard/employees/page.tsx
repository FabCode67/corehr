import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { fetchDepartmentEmployees } from "@/lib/api/department-dashboard"
import { fetchEmployeeExportColumns } from "@/lib/api/employees"
import { fullName } from "@/lib/format-name"

import { DepartmentApiError, DepartmentEmptyState, DepartmentSwitcher, resolveDepartmentContext } from "../shared"
import { DepartmentDashboardTabs } from "../tabs"
import { DepartmentEmployeesExportDialog } from "./export-dialog"

export default async function DepartmentEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string; search?: string }>
}) {
  const { dept, search } = await searchParams
  const context = await resolveDepartmentContext(dept)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Department Dashboard</h1>
        <p className="text-sm text-muted-foreground">Employees in the department(s) you head.</p>
      </div>

      {context.status === "error" ? <DepartmentApiError message={context.message} /> : null}
      {context.status === "empty" ? <DepartmentEmptyState /> : null}

      {context.status === "ok" ? (
        <>
          <DepartmentDashboardTabs active="employees" dept={context.selectedDepartmentId} />
          <DepartmentSwitcher
            departments={context.departments}
            selectedDepartmentId={context.selectedDepartmentId}
            basePath="/staff/department-dashboard/employees"
          />
          <EmployeesTable
            departmentId={context.selectedDepartmentId}
            actingEmployeeId={context.actingEmployeeId}
            search={search}
          />
        </>
      ) : null}
    </div>
  )
}

async function EmployeesTable({
  departmentId,
  actingEmployeeId,
  search,
}: {
  departmentId: string
  actingEmployeeId: string
  search?: string
}) {
  const [employeesResult, columnsResult] = await Promise.all([
    fetchDepartmentEmployees(departmentId, actingEmployeeId, { search, pageSize: 50 }),
    fetchEmployeeExportColumns(),
  ])

  if (!employeesResult.ok) {
    return <DepartmentApiError message={employeesResult.error} />
  }

  const employees = employeesResult.data.data

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Employees</CardTitle>
          <CardDescription>
            {employeesResult.data.total} employee{employeesResult.data.total === 1 ? "" : "s"} — read-only, export
            available below.
          </CardDescription>
        </div>
        {columnsResult.ok ? (
          <DepartmentEmployeesExportDialog departmentId={departmentId} actingEmployeeId={actingEmployeeId} columns={columnsResult.data} />
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form method="get" className="flex max-w-md items-end gap-2">
          <Input
            type="search"
            name="search"
            placeholder="Search by name, staff ID, or email…"
            defaultValue={search ?? ""}
            className="flex-1"
          />
          <input type="hidden" name="dept" value={departmentId} />
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <th className="px-3 py-2">Staff ID</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Position</th>
                <th className="px-3 py-2">Branch</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No employees match.
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.employeeNumber} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs">{employee.employeeNumber}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/staff/department-dashboard/employees/${employee.employeeNumber}?dept=${departmentId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {fullName(employee)}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{employee.position?.title ?? "Not yet assigned"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{employee.branch?.name ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant={employee.isActive ? "success" : "outline"}>{employee.isActive ? "Active" : "Exited"}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
