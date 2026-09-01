import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import { Select } from "@/components/ui/select"
import { fetchBands } from "@/lib/api/bands"
import { fetchBranches } from "@/lib/api/branches"
import { fetchDepartments } from "@/lib/api/departments"
import {
  fetchAssignmentsPaginated,
  fetchTrainingCategories,
  ASSIGNMENT_STATUS_LABELS,
  PRIORITY_LABELS,
  TERMINAL_ASSIGNMENT_STATUSES,
  type CourseAssignmentPriority,
  type CourseAssignmentStatus,
} from "@/lib/api/learning"
import { fetchPositionLevels, fetchPositions } from "@/lib/api/positions"
import { getSession } from "@/lib/get-session"

import { LearningTabs } from "../learning-tabs"

const STATUS_VARIANT: Record<CourseAssignmentStatus, "outline" | "secondary" | "success" | "destructive"> = {
  ASSIGNED: "outline",
  ACCEPTED: "secondary",
  IN_PROGRESS: "secondary",
  COMPLETED_BY_EMPLOYEE: "secondary",
  PENDING_VERIFICATION: "secondary",
  VERIFIED: "success",
  REJECTED: "destructive",
  CLOSED: "success",
}

interface SearchParams {
  [key: string]: string | undefined
  categoryId?: string
  status?: string
  isMandatory?: string
  departmentId?: string
  branchId?: string
  positionId?: string
  levelId?: string
  bandId?: string
  priority?: string
  overdueOnly?: string
  page?: string
}

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = await searchParams
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [assignmentsResult, categoriesResult, departmentsResult, branchesResult, positionsResult, levelsResult, bandsResult] = await Promise.all([
    fetchAssignmentsPaginated(
      {
        categoryId: filters.categoryId,
        status: filters.status as CourseAssignmentStatus | undefined,
        isMandatory: filters.isMandatory === "true" ? true : filters.isMandatory === "false" ? false : undefined,
        departmentId: filters.departmentId,
        branchId: filters.branchId,
        positionId: filters.positionId,
        levelId: filters.levelId,
        bandId: filters.bandId,
        priority: filters.priority as CourseAssignmentPriority | undefined,
        overdueOnly: filters.overdueOnly === "true",
      },
      actingEmployeeId,
      filters.page ? Number(filters.page) : 1
    ),
    fetchTrainingCategories(),
    fetchDepartments(),
    fetchBranches(),
    fetchPositions(),
    fetchPositionLevels(),
    fetchBands(),
  ])

  const categories = categoriesResult.ok ? categoriesResult.data : []
  const departments = departmentsResult.ok ? departmentsResult.data : []
  const branches = branchesResult.ok ? branchesResult.data : []
  const positions = positionsResult.ok ? [...positionsResult.data].sort((a, b) => a.title.localeCompare(b.title)) : []
  const levels = levelsResult.ok ? [...levelsResult.data].sort((a, b) => a.rank - b.rank) : []
  const bands = bandsResult.ok ? [...bandsResult.data].sort((a, b) => a.rank - b.rank) : []
  const assignments = assignmentsResult.ok ? assignmentsResult.data.data : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Learning & Development</h1>
          <p className="text-sm text-muted-foreground">
            Every assigned course across the bank — assign, track, and verify completion.
          </p>
        </div>
        <Link href="/admin/learning/assignments/new" className={buttonVariants({ size: "sm" })}>
          Assign a course
        </Link>
      </div>

      <LearningTabs />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Category</label>
              <Select name="categoryId" defaultValue={filters.categoryId ?? ""} className="w-44">
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select name="status" defaultValue={filters.status ?? ""} className="w-44">
                <option value="">Any status</option>
                {Object.entries(ASSIGNMENT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Mandatory</label>
              <Select name="isMandatory" defaultValue={filters.isMandatory ?? ""} className="w-36">
                <option value="">Any</option>
                <option value="true">Mandatory only</option>
                <option value="false">Optional only</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Department</label>
              <Select name="departmentId" defaultValue={filters.departmentId ?? ""} className="w-40">
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Branch</label>
              <Select name="branchId" defaultValue={filters.branchId ?? ""} className="w-40">
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Position</label>
              <Select name="positionId" defaultValue={filters.positionId ?? ""} className="w-44">
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
              <Select name="levelId" defaultValue={filters.levelId ?? ""} className="w-40">
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
              <Select name="bandId" defaultValue={filters.bandId ?? ""} className="w-36">
                <option value="">All bands</option>
                {bands.map((band) => (
                  <option key={band.id} value={band.id}>
                    {band.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Priority</label>
              <Select name="priority" defaultValue={filters.priority ?? ""} className="w-32">
                <option value="">Any priority</option>
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <label className="flex h-9 items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                name="overdueOnly"
                value="true"
                defaultChecked={filters.overdueOnly === "true"}
                className="size-4 rounded border-input"
              />
              Overdue only
            </label>
            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

      {!assignmentsResult.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{assignmentsResult.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : assignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No course assignments match these filters.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Due date</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assignments.map((assignment) => {
                  const overdue =
                    assignment.dueDate &&
                    new Date(assignment.dueDate) < new Date() &&
                    !TERMINAL_ASSIGNMENT_STATUSES.includes(assignment.status)
                  return (
                    <tr key={assignment.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {assignment.employee.firstName} {assignment.employee.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{assignment.department?.name ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-foreground">{assignment.course.name}</p>
                        {assignment.isMandatory ? (
                          <Badge variant="destructive" className="mt-1">
                            Mandatory
                          </Badge>
                        ) : null}
                      </td>
                      <td className={`px-4 py-3 ${overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                        {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "—"}
                        {overdue ? " (overdue)" : ""}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{PRIORITY_LABELS[assignment.priority]}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[assignment.status]}>
                          {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/learning/assignments/${assignment.id}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {assignmentsResult.ok ? (
            <Pagination
              page={assignmentsResult.data.page}
              totalPages={assignmentsResult.data.totalPages}
              total={assignmentsResult.data.total}
              pageSize={assignmentsResult.data.pageSize}
              basePath="/admin/learning/assignments"
              searchParams={filters}
            />
          ) : null}
        </Card>
      )}
    </div>
  )
}
