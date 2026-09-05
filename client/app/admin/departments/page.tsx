import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { fetchDepartments, type Department } from "@/lib/api/departments"
import { getSession } from "@/lib/get-session"

import { ImportManager } from "../imports/import-manager"
import { deactivateDepartment } from "./actions"

function DepartmentActions({ department }: { department: Department }) {
  return (
    <div className="flex items-center justify-end gap-3">
      <Link href={`/admin/departments/${department.id}`} className="text-xs font-medium text-primary hover:underline">
        Edit
      </Link>
      {department.isActive ? (
        <form action={deactivateDepartment.bind(null, department.id)}>
          <button type="submit" className="text-xs font-medium text-destructive hover:underline">
            Deactivate
          </button>
        </form>
      ) : null}
    </div>
  )
}

/** A department's row, plus its units listed as chips underneath — units
 *  are a subdivision of exactly one department, so they're always rendered
 *  as this department's direct children regardless of whether the
 *  department itself is top-level or a sub-department of another. */
function DepartmentRow({ department, indent = false }: { department: Department; indent?: boolean }) {
  return (
    <div className={indent ? "border-t border-border/60 bg-muted/20 pl-8" : "border-t border-border first:border-t-0"}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          {indent ? <span className="text-muted-foreground">&#8627;</span> : null}
          <div>
            <p className="font-medium text-foreground">
              {department.name}
              {department.code ? <span className="ml-1.5 font-normal text-xs text-muted-foreground">{department.code}</span> : null}
            </p>
            <p className="text-xs text-muted-foreground">{department.function?.name ?? "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={department.isActive ? "success" : "outline"}>{department.isActive ? "Active" : "Inactive"}</Badge>
          <DepartmentActions department={department} />
        </div>
      </div>
      {department.units && department.units.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3 pl-11">
          <span className="text-xs text-muted-foreground">Units:</span>
          {department.units.map((unit) => (
            <Badge key={unit.id} variant="outline" className="font-normal">
              {unit.name}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default async function AdminDepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const { search } = await searchParams
  const [result, session] = await Promise.all([fetchDepartments(), getSession()])
  const actingEmployeeId = session?.employeeId ?? ""

  const departments = result.ok ? result.data : []
  const normalizedSearch = search?.trim().toLowerCase() ?? ""
  const filtered = normalizedSearch
    ? departments.filter((department) => department.name.toLowerCase().includes(normalizedSearch))
    : departments

  // Tree view (default): top-level departments (no parentDepartmentId) each
  // with their own units and any sub-departments that report to them (each
  // of those, in turn, showing its own units) nested underneath — see
  // Department.parentDepartmentId's schema doc comment. One level of
  // department-to-department nesting is all this app's UI assumes; a
  // sub-department's own children (if any exist in the data) simply won't
  // be shown, same as before this page understood the hierarchy at all.
  // Searching flattens this into a plain filtered list instead, since a
  // matching child's non-matching parent wouldn't have anywhere sensible to
  // nest under.
  const topLevel = filtered.filter((department) => !department.parentDepartmentId)
  const childrenByParentId = new Map<string, Department[]>()
  for (const department of filtered) {
    if (!department.parentDepartmentId) continue
    const siblings = childrenByParentId.get(department.parentDepartmentId) ?? []
    siblings.push(department)
    childrenByParentId.set(department.parentDepartmentId, siblings)
  }
  // Sub-departments whose parent got filtered out by the search still need
  // to show up somewhere rather than silently vanishing.
  const parentIds = new Set(departments.map((department) => department.id))
  const orphanedChildren = normalizedSearch
    ? filtered.filter((department) => department.parentDepartmentId && !parentIds.has(department.parentDepartmentId))
    : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Departments</h1>
          <p className="text-sm text-muted-foreground">
            Departments belong to a Function and may have Units and sub-departments (departments that report to
            another department) nested underneath them.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportManager moduleKey="departments" moduleLabel="Departments" actingEmployeeId={actingEmployeeId} />
          <Link href="/admin/departments/new" className={buttonVariants({ size: "sm" })}>
            New department
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Search</label>
              <Input name="search" placeholder="Department name…" defaultValue={search ?? ""} className="w-56" />
            </div>
            <button type="submit" className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80">
              Apply
            </button>
            {search ? (
              <Link href="/admin/departments" className="h-9 rounded-lg border border-border px-3 text-sm font-medium text-foreground leading-9 hover:bg-muted">
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
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {normalizedSearch ? (
              "No departments match your search."
            ) : (
              <>
                No departments yet.{" "}
                <Link href="/admin/departments/new" className="text-primary underline">
                  Create the first one
                </Link>
                .
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          {(normalizedSearch ? filtered : topLevel).map((department) => (
            <div key={department.id}>
              <DepartmentRow department={department} />
              {!normalizedSearch &&
                (childrenByParentId.get(department.id) ?? []).map((child) => <DepartmentRow key={child.id} department={child} indent />)}
            </div>
          ))}
          {orphanedChildren.map((department) => (
            <DepartmentRow key={department.id} department={department} />
          ))}
        </Card>
      )}
    </div>
  )
}
