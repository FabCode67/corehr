import { CalendarDays, FileText, Target, Users, type LucideIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchDepartmentDashboardSummary, type DepartmentDashboardSummary } from "@/lib/api/department-dashboard"
import { fullName } from "@/lib/format-name"

import { BreakdownBars, BreakdownDonut } from "./charts"
import { DepartmentApiError, DepartmentEmptyState, DepartmentSwitcher, resolveDepartmentContext } from "./shared"
import { DepartmentDashboardTabs } from "./tabs"

const GENDER_LABEL: Record<string, string> = { MALE: "Male", FEMALE: "Female" }
const CONTRACT_TYPE_LABEL: Record<string, string> = {
  PERMANENT: "Permanent",
  TEMPORARY: "Temporary",
  GRADUATE_TRAINEE: "Graduate Trainee",
  INTERN: "Intern",
}
const REVIEW_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  ACKNOWLEDGED: "Acknowledged",
  FINALIZED: "Finalized",
}
const FORM_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  PENDING_SIGNATURES: "Pending signatures",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
}

function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: LucideIcon }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <Icon className="size-4 shrink-0 text-secondary" />
      </CardContent>
    </Card>
  )
}

export default async function DepartmentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>
}) {
  const { dept } = await searchParams
  const context = await resolveDepartmentContext(dept)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Department Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          A summary report, plus employees/positions/learning/org chart views and job requisitions, for the
          department(s) you head.
        </p>
      </div>

      {context.status === "error" ? <DepartmentApiError message={context.message} /> : null}
      {context.status === "empty" ? <DepartmentEmptyState /> : null}

      {context.status === "ok" ? (
        <>
          <DepartmentDashboardTabs active="overview" dept={context.selectedDepartmentId} />
          <DepartmentSwitcher
            departments={context.departments}
            selectedDepartmentId={context.selectedDepartmentId}
            basePath="/staff/department-dashboard"
          />
          <DepartmentOverview departmentId={context.selectedDepartmentId} actingEmployeeId={context.actingEmployeeId} />
        </>
      ) : null}
    </div>
  )
}

async function DepartmentOverview({ departmentId, actingEmployeeId }: { departmentId: string; actingEmployeeId: string }) {
  const summaryResult = await fetchDepartmentDashboardSummary(departmentId, actingEmployeeId)

  if (!summaryResult.ok) {
    return <DepartmentApiError message={summaryResult.error} />
  }

  return <DepartmentSummary summary={summaryResult.data} />
}

function DepartmentSummary({ summary }: { summary: DepartmentDashboardSummary }) {
  const { department, headcount, performance, leave, forms } = summary

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{department.name}</CardTitle>
          <CardDescription>
            {department.functionName}
            {department.code ? ` · ${department.code}` : ""}
            {department.headOfDepartment ? ` · Head of Department: ${fullName(department.headOfDepartment)}` : ""}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Headcount" value={String(headcount.total)} hint={`${headcount.vacantPositions} vacant position${headcount.vacantPositions === 1 ? "" : "s"}`} icon={Users} />
        <StatCard
          label="Performance"
          value={performance.averageRating !== null ? `${performance.averageRating} / 5` : "—"}
          hint={`${performance.completionRate}% of ${performance.total} review${performance.total === 1 ? "" : "s"} finalized`}
          icon={Target}
        />
        <StatCard label="Leave pending" value={String(leave.pendingApprovalCount)} hint="Awaiting approval" icon={CalendarDays} />
        <StatCard label="On leave now" value={String(leave.currentlyOnLeaveCount)} hint={`${leave.totalDaysTakenThisYear} days taken this year`} icon={CalendarDays} />
        <StatCard label="Forms pending" value={String(forms.pendingCount)} hint={`${forms.overdueCount} overdue`} icon={FileText} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employees</CardTitle>
            <CardDescription>Gender and contract type breakdown, active employees only.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">By gender</p>
              <BreakdownDonut data={headcount.byGender.map((row) => ({ label: GENDER_LABEL[row.gender] ?? row.gender, count: row.count }))} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">By contract type</p>
              <BreakdownDonut
                data={headcount.byContractType.map((row) => ({ label: CONTRACT_TYPE_LABEL[row.contractType] ?? row.contractType, count: row.count }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance</CardTitle>
            <CardDescription>All reviews on record for this department, by status and rating.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">By status</p>
              <BreakdownBars
                data={performance.byStatus.map((row) => ({ label: REVIEW_STATUS_LABEL[row.status] ?? row.status, count: row.count }))}
                barLabel="Reviews"
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">Rating distribution</p>
              <BreakdownBars data={performance.ratingDistribution.map((row) => ({ label: `${row.rating} / 5`, count: row.count }))} barLabel="Reviews" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leave</CardTitle>
            <CardDescription>Approved or completed leave taken this year, by type.</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownBars data={leave.byType.map((row) => ({ label: row.leaveTypeName, count: row.count }))} barLabel="Requests" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Forms &amp; requests</CardTitle>
            <CardDescription>
              {forms.completedThisMonth} completed this month · all form instances assigned to this department&apos;s employees.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownBars data={forms.byStatus.map((row) => ({ label: FORM_STATUS_LABEL[row.status] ?? row.status, count: row.count }))} barLabel="Forms" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
