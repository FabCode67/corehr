import Link from "next/link"

import { Download } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/ui/pagination"
import { Select } from "@/components/ui/select"
import { fetchBands } from "@/lib/api/bands"
import { fetchBranches } from "@/lib/api/branches"
import { fetchDepartments } from "@/lib/api/departments"
import {
  allEmployeesFamilyTreeExportUrl,
  computeProbationRemainingDays,
  computeTenure,
  computeTotalBankingExperienceYears,
  fetchEmployeeExportColumns,
  fetchEmployeesPaginated,
  fetchLineManagersBatch,
  formatTenure,
} from "@/lib/api/employees"
import { fetchPositionLevels, fetchPositions } from "@/lib/api/positions"
import { getSession } from "@/lib/get-session"

import { ImportManager } from "../imports/import-manager"
import { ExportColumnsDialog } from "./export-columns-dialog"

const STATUS_VARIANT: Record<string, "success" | "destructive"> = {
  ACTIVE: "success",
  EXIT: "destructive",
}

interface SearchParams {
  page?: string
  branchId?: string
  departmentId?: string
  positionId?: string
  bandId?: string
  levelId?: string
  search?: string
}

export default async function AdminEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { page, branchId, departmentId, positionId, bandId, levelId, search } = await searchParams

  // Employee records are never deleted — exited employees stay visible
  // (with a status badge) for historical reporting, per the spec.
  const [result, lineManagersResult, session, exportColumnsResult, branchesResult, departmentsResult, positionsResult, levelsResult, bandsResult] =
    await Promise.all([
      fetchEmployeesPaginated({
        includeInactive: true,
        branchId,
        departmentId,
        positionId,
        bandId,
        levelId,
        search,
        page: page ? Number(page) : 1,
      }),
      fetchLineManagersBatch(),
      getSession(),
      fetchEmployeeExportColumns(),
      fetchBranches(),
      fetchDepartments(),
      fetchPositions(),
      fetchPositionLevels(),
      fetchBands(),
    ])
  const lineManagers = lineManagersResult.ok ? lineManagersResult.data : {}
  const actingEmployeeId = session?.employeeId ?? ""
  const exportColumns = exportColumnsResult.ok ? exportColumnsResult.data : []
  const branches = branchesResult.ok ? branchesResult.data : []
  const departments = departmentsResult.ok ? departmentsResult.data : []
  const positions = positionsResult.ok ? [...positionsResult.data].sort((a, b) => a.title.localeCompare(b.title)) : []
  const levels = levelsResult.ok ? [...levelsResult.data].sort((a, b) => a.rank - b.rank) : []
  const bands = bandsResult.ok ? [...bandsResult.data].sort((a, b) => a.rank - b.rank) : []
  const hasFilters = Boolean(branchId || departmentId || positionId || bandId || levelId || search)

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
          <a
            href={allEmployeesFamilyTreeExportUrl(actingEmployeeId)}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <Download className="mr-1 size-3.5" /> Export Family Tree (all staff)
          </a>
          <Link href="/admin/employees/new" className={buttonVariants({ size: "sm" })}>
            New employee
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Search</label>
              <Input
                name="search"
                placeholder="Name, Staff ID, or email…"
                defaultValue={search ?? ""}
                className="w-56"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Location</label>
              <Select name="branchId" defaultValue={branchId ?? ""} className="w-44">
                <option value="">All locations</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Department</label>
              <Select name="departmentId" defaultValue={departmentId ?? ""} className="w-44">
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Position</label>
              <Select name="positionId" defaultValue={positionId ?? ""} className="w-44">
                <option value="">All positions</option>
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Level</label>
              <Select name="levelId" defaultValue={levelId ?? ""} className="w-40">
                <option value="">All levels</option>
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Band</label>
              <Select name="bandId" defaultValue={bandId ?? ""} className="w-36">
                <option value="">All bands</option>
                {bands.map((band) => (
                  <option key={band.id} value={band.id}>
                    {band.name}
                  </option>
                ))}
              </Select>
            </div>
            <button type="submit" className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80">
              Apply
            </button>
            {hasFilters ? (
              <Link href="/admin/employees" className="h-9 rounded-lg border border-border px-3 text-sm font-medium text-foreground leading-9 hover:bg-muted">
                Reset
              </Link>
            ) : null}
          </form>
        </CardContent>
      </Card>

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
                  <th className="px-4 py-3 font-medium">Staff ID</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Position</th>
                  <th className="px-4 py-3 font-medium">Department / Unit</th>
                  <th className="px-4 py-3 font-medium">Location Code</th>
                  <th className="px-4 py-3 font-medium">Band</th>
                  <th className="px-4 py-3 font-medium">Line Manager</th>
                  <th className="px-4 py-3 font-medium">Tenure</th>
                  <th className="px-4 py-3 font-medium">Banking Experience</th>
                  <th className="px-4 py-3 font-medium">Probation</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.data.data.map((employee) => (
                  <tr key={employee.employeeNumber} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{employee.employeeNumber}</td>
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
                      {employee.branch?.code ?? "—"}
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
                      {(() => {
                        const remaining = computeProbationRemainingDays(employee.probationEndDate)
                        if (remaining === null) return <span className="text-muted-foreground">—</span>
                        if (remaining < 0) return <span className="text-muted-foreground">Completed</span>
                        if (remaining === 0) return <Badge variant="destructive">Ends today</Badge>
                        if (remaining <= 10) return <Badge variant="destructive">{remaining} day{remaining === 1 ? "" : "s"} left</Badge>
                        return <span className="text-muted-foreground">{remaining} days left</span>
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
            searchParams={{ branchId, departmentId, positionId, bandId, levelId, search }}
          />
        </Card>
      )}
    </div>
  )
}
