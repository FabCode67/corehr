import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { fetchBranches } from "@/lib/api/branches"
import { fetchDepartments, fetchFunctions } from "@/lib/api/departments"
import {
  fetchComplianceByDepartment,
  fetchLearningOverview,
  fetchLearningProgressBreakdown,
  fetchTeamOverdueMandatory,
  fetchTrainingCategories,
  type LearningAnalyticsFilters,
} from "@/lib/api/learning"
import { getSession } from "@/lib/get-session"

import { ImportManager } from "../imports/import-manager"
import { LearningTabs } from "./learning-tabs"

interface SearchParams {
  categoryId?: string
  departmentId?: string
  branchId?: string
  functionId?: string
  isMandatory?: string
}

function HorizontalBarList({
  rows,
  suffix = "",
}: {
  rows: Array<{ label: string; value: number; sub?: string }>
  suffix?: string
}) {
  const max = Math.max(1, ...rows.map((row) => row.value))

  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No data for this selection.</p>
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3 text-sm">
          <div className="w-36 shrink-0 truncate text-muted-foreground" title={row.label}>
            {row.label}
          </div>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
            />
          </div>
          <div className="w-20 shrink-0 text-right font-medium text-foreground">
            {row.value}
            {suffix}
            {row.sub ? <span className="text-muted-foreground"> {row.sub}</span> : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  )
}

export default async function LearningDashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = await searchParams
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const analyticsFilters: LearningAnalyticsFilters = {
    categoryId: filters.categoryId,
    departmentId: filters.departmentId,
    branchId: filters.branchId,
    functionId: filters.functionId,
    isMandatory: filters.isMandatory === "true" ? true : filters.isMandatory === "false" ? false : undefined,
  }

  const [
    categoriesResult,
    departmentsResult,
    branchesResult,
    functionsResult,
    overviewResult,
    progressResult,
    complianceResult,
    overdueResult,
  ] = await Promise.all([
    fetchTrainingCategories(),
    fetchDepartments(),
    fetchBranches(),
    fetchFunctions(),
    fetchLearningOverview(analyticsFilters),
    fetchLearningProgressBreakdown(analyticsFilters),
    fetchComplianceByDepartment(analyticsFilters),
    fetchTeamOverdueMandatory(actingEmployeeId),
  ])

  const categories = categoriesResult.ok ? categoriesResult.data : []
  const departments = departmentsResult.ok ? departmentsResult.data : []
  const branches = branchesResult.ok ? branchesResult.data : []
  const functions = functionsResult.ok ? functionsResult.data : []
  const overdue = overdueResult.ok ? overdueResult.data : []

  const progressRows = progressResult.ok
    ? [
        { label: "Not started", value: progressResult.data.notStarted },
        { label: "Accepted", value: progressResult.data.accepted },
        { label: "In progress", value: progressResult.data.inProgress },
        { label: "Completed (awaiting cert.)", value: progressResult.data.completedByEmployee },
        { label: "Pending verification", value: progressResult.data.pendingVerification },
        { label: "Verified", value: progressResult.data.verified },
        { label: "Rejected", value: progressResult.data.rejected },
        { label: "Closed", value: progressResult.data.closed },
      ]
    : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Learning & Development</h1>
          <p className="text-sm text-muted-foreground">
            Executive overview of course completion, mandatory compliance, and organization-wide training progress.
          </p>
        </div>
        <ImportManager moduleKey="training" moduleLabel="Training" actingEmployeeId={actingEmployeeId} />
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
              <label className="text-xs text-muted-foreground">Function</label>
              <Select name="functionId" defaultValue={filters.functionId ?? ""} className="w-40">
                <option value="">All functions</option>
                {functions.map((fn) => (
                  <option key={fn.id} value={fn.id}>
                    {fn.name}
                  </option>
                ))}
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
              <label className="text-xs text-muted-foreground">Mandatory</label>
              <Select name="isMandatory" defaultValue={filters.isMandatory ?? ""} className="w-36">
                <option value="">Any</option>
                <option value="true">Mandatory only</option>
                <option value="false">Optional only</option>
              </Select>
            </div>
            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

      {overdue.length > 0 ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base text-destructive">
              {overdue.length} employee(s) with overdue mandatory training
            </CardTitle>
            <CardDescription>Includes AML and every other mandatory course past its due date.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1.5 text-sm">
              {overdue.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-center justify-between">
                  <span className="text-foreground">
                    {a.employee.firstName} {a.employee.lastName} — {a.course.name}
                  </span>
                  <Link href={`/admin/learning/assignments/${a.id}`} className="text-xs text-primary hover:underline">
                    View
                  </Link>
                </li>
              ))}
            </ul>
            {overdue.length > 8 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                +{overdue.length - 8} more —{" "}
                <Link href="/admin/learning/assignments?overdueOnly=true" className="text-primary hover:underline">
                  view all overdue
                </Link>
                .
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {overviewResult.ok ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Total courses" value={overviewResult.data.totalCourses} />
          <KpiCard label="Active courses" value={overviewResult.data.activeCourses} />
          <KpiCard label="Mandatory courses" value={overviewResult.data.mandatoryCourses} />
          <KpiCard label="Optional courses" value={overviewResult.data.optionalCourses} />
          <KpiCard label="Total assignments" value={overviewResult.data.totalAssignments} />
          <KpiCard label="Completed assignments" value={overviewResult.data.completedAssignments} />
          <KpiCard label="Completion rate" value={`${overviewResult.data.completionRate}%`} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Course progress</CardTitle>
            <CardDescription>
              Assignments by lifecycle status{progressResult.ok ? ` · ${progressResult.data.overdue} overdue` : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarList rows={progressRows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mandatory training compliance by department</CardTitle>
            <CardDescription>Percentage of mandatory assignments completed.</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarList
              rows={
                complianceResult.ok
                  ? complianceResult.data.map((entry) => ({
                      label: entry.name,
                      value: entry.compliancePercent,
                      sub: `(${entry.completedMandatory}/${entry.totalMandatory})`,
                    }))
                  : []
              }
              suffix="%"
            />
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        For department, function, institution, and cost breakdowns, see{" "}
        <Link href="/admin/learning/reports" className="text-primary hover:underline">
          Learning Reports
        </Link>
        .
      </p>
    </div>
  )
}
