import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchMyHeadedDepartments, type HeadedDepartment } from "@/lib/api/department-dashboard"
import { getSession } from "@/lib/get-session"
import { cn } from "@/lib/utils"

export type DepartmentContext =
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ok"; departments: HeadedDepartment[]; selectedDepartmentId: string; actingEmployeeId: string }

/** Every tab under the Head of Department portal needs the same three
 *  things before it can do anything else: who's acting, which department(s)
 *  they head, and which one is currently selected (via the ?dept= query
 *  param, same convention as the Overview page). Centralized here so the
 *  six pages under this route don't each re-derive the "no departments yet"
 *  / "bad dept id" edge cases slightly differently. */
export async function resolveDepartmentContext(dept: string | undefined): Promise<DepartmentContext> {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const departmentsResult = await fetchMyHeadedDepartments(actingEmployeeId)
  if (!departmentsResult.ok) {
    return { status: "error", message: departmentsResult.error }
  }

  const departments = departmentsResult.data
  if (departments.length === 0) {
    return { status: "empty" }
  }

  const selectedDepartmentId = dept && departments.some((d) => d.id === dept) ? dept : departments[0].id
  return { status: "ok", departments, selectedDepartmentId, actingEmployeeId }
}

export function DepartmentApiError({ message }: { message: string }) {
  return (
    <Card className="max-w-2xl border-dashed border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  )
}

export function DepartmentEmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        You are not currently set as the Head of a Department, so there&apos;s nothing to show here yet. If this looks wrong,
        ask HR to check the Head of Department field on your department.
      </CardContent>
    </Card>
  )
}

/** Same pill-style department switcher as the Overview page, reused as-is on
 *  every other tab — only ever rendered when there's more than one headed
 *  department to switch between. */
export function DepartmentSwitcher({
  departments,
  selectedDepartmentId,
  basePath,
}: {
  departments: HeadedDepartment[]
  selectedDepartmentId: string
  basePath: string
}) {
  if (departments.length <= 1) return null

  return (
    <div className="flex flex-wrap gap-2">
      {departments.map((department) => (
        <Link
          key={department.id}
          href={`${basePath}?dept=${department.id}`}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            department.id === selectedDepartmentId
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          {department.name}
        </Link>
      ))}
    </div>
  )
}
