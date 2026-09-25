import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { FamilyTree } from "@/components/family-tree/family-tree"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  fetchDepartmentEmployee,
  fetchDepartmentEmployeeForms,
  fetchDepartmentEmployeeFamily,
  fetchDepartmentEmployeeLeaveDetail,
  fetchDepartmentEmployeePerformanceHistory,
  fetchDepartmentEmployeeProfessionalProfile,
  fetchDepartmentEmployeeRelations,
  fetchDepartmentLearningHours,
} from "@/lib/api/department-dashboard"
import { formatEnumLabel } from "@/lib/api/employees"
import { INSTANCE_STATUS_LABELS, type FormInstanceStatus } from "@/lib/api/forms"
import { fullName } from "@/lib/format-name"

import { DepartmentApiError, DepartmentEmptyState, resolveDepartmentContext } from "../../shared"

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

const FORM_STATUS_VARIANT: Record<FormInstanceStatus, "outline" | "success" | "destructive" | "secondary"> = {
  DRAFT: "outline",
  ASSIGNED: "secondary",
  IN_PROGRESS: "secondary",
  SUBMITTED: "outline",
  PENDING_SIGNATURES: "outline",
  REJECTED: "destructive",
  COMPLETED: "success",
  ARCHIVED: "outline",
}

const CASE_STATUS_VARIANT: Record<string, "outline" | "success" | "destructive" | "secondary"> = {
  DRAFT: "outline",
  UNDER_INVESTIGATION: "secondary",
  PENDING_DECISION: "secondary",
  SANCTION_ISSUED: "destructive",
  CLOSED: "success",
  APPEALED: "destructive",
}

/**
 * Department head's full profile view of one of their employees — the
 * "see a profile of his each and every employee, including birthdate,
 * joining date, leaves, employee relation status, performance, learning
 * hours, relatives, forms and everything related" request. Every section
 * below is its own department-scoped, access-gated fetch (see
 * DepartmentDashboardService's "Employee full profile" section) — a
 * section that fails to load (e.g. no data yet) degrades to a small inline
 * note rather than failing the whole page.
 */
export default async function DepartmentEmployeeProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>
  searchParams: Promise<{ dept?: string }>
}) {
  const { employeeId } = await params
  const { dept } = await searchParams
  const context = await resolveDepartmentContext(dept)

  if (context.status === "error") return <DepartmentApiError message={context.message} />
  if (context.status === "empty") return <DepartmentEmptyState />

  const { selectedDepartmentId, actingEmployeeId } = context

  const [employeeResult, familyResult, relationsResult, profileResult, formsResult, performanceResult, leaveResult, learningResult] =
    await Promise.all([
      fetchDepartmentEmployee(selectedDepartmentId, employeeId, actingEmployeeId),
      fetchDepartmentEmployeeFamily(selectedDepartmentId, employeeId, actingEmployeeId),
      fetchDepartmentEmployeeRelations(selectedDepartmentId, employeeId, actingEmployeeId),
      fetchDepartmentEmployeeProfessionalProfile(selectedDepartmentId, employeeId, actingEmployeeId),
      fetchDepartmentEmployeeForms(selectedDepartmentId, employeeId, actingEmployeeId),
      fetchDepartmentEmployeePerformanceHistory(selectedDepartmentId, employeeId, actingEmployeeId),
      fetchDepartmentEmployeeLeaveDetail(selectedDepartmentId, employeeId, actingEmployeeId),
      fetchDepartmentLearningHours(selectedDepartmentId, actingEmployeeId),
    ])

  if (!employeeResult.ok) return <DepartmentApiError message={employeeResult.error} />
  const employee = employeeResult.data
  const learningRow = learningResult.ok ? learningResult.data.find((row) => row.employeeNumber === employeeId) : undefined

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/staff/department-dashboard/employees?dept=${selectedDepartmentId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to employees
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">{fullName(employee)}</h1>
          <Badge variant={employee.isActive ? "success" : "outline"}>{formatEnumLabel(employee.employmentStatus)}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {employee.employeeNumber} · {employee.email} · {employee.position?.title ?? "No position assigned"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Date of birth" value={formatDate(employee.dateOfBirth)} />
          <Field label="Gender" value={formatEnumLabel(employee.gender)} />
          <Field label="Marital status" value={formatEnumLabel(employee.maritalStatus)} />
          <Field label="Nationality" value={employee.nationality} />
          <Field label="National ID" value={employee.nationalIdNumber} />
          <Field label="Phone" value={employee.phone} />
          <Field label="Joining date" value={formatDate(employee.employmentStartDate)} />
          <Field label="Contract type" value={employee.contractType ? formatEnumLabel(employee.contractType) : "—"} />
          <Field label="Probation end date" value={formatDate(employee.probationEndDate)} />
          <Field label="Contract end date" value={formatDate(employee.contractEndDate)} />
          <Field label="Department" value={employee.position?.department.name ?? "—"} />
          <Field label="Unit" value={employee.position?.unit?.name ?? "—"} />
          <Field label="Band" value={employee.band?.name ?? "—"} />
          <Field label="Branch" value={employee.branch?.name ?? "—"} />
          {employee.employmentStatus === "EXIT" ? (
            <>
              <Field label="Exit date" value={formatDate(employee.exitDate)} />
              <Field label="Exit reason" value={employee.exitReason ? formatEnumLabel(employee.exitReason) : "—"} />
              <Field label="Exit type" value={employee.exitType ? formatEnumLabel(employee.exitType) : "—"} />
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Family & relatives</CardTitle>
          <CardDescription>Spouse, children, and other registered relatives.</CardDescription>
        </CardHeader>
        <CardContent>
          {familyResult.ok ? <FamilyTree tree={familyResult.data} /> : <p className="text-sm text-muted-foreground">{familyResult.error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leave</CardTitle>
          <CardDescription>Current-year balances and recent requests.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!leaveResult.ok ? (
            <p className="text-sm text-muted-foreground">{leaveResult.error}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {leaveResult.data.balances.map((balance) => (
                  <div key={balance.id} className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">{balance.leaveType.name}</p>
                    <p className="text-lg font-semibold text-foreground">{balance.remainingDays}</p>
                    <p className="text-xs text-muted-foreground">of {balance.entitledDays + balance.carriedForwardDays} days remaining</p>
                  </div>
                ))}
                {leaveResult.data.balances.length === 0 ? <p className="text-sm text-muted-foreground">No leave balances yet.</p> : null}
              </div>
              <div className="flex flex-col gap-2">
                {leaveResult.data.requests.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                    <span>
                      {request.leaveType.name} · {formatDate(request.startDate)} – {formatDate(request.endDate)}
                    </span>
                    <Badge variant="outline">{formatEnumLabel(request.status)}</Badge>
                  </div>
                ))}
                {leaveResult.data.requests.length === 0 ? <p className="text-sm text-muted-foreground">No leave requests on record.</p> : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance</CardTitle>
          <CardDescription>Review history, most recent first.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {!performanceResult.ok ? (
            <p className="text-sm text-muted-foreground">{performanceResult.error}</p>
          ) : performanceResult.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No performance reviews on record.</p>
          ) : (
            performanceResult.data.map((review) => (
              <div key={review.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm">
                <span>
                  {review.period.name} ({review.period.year}) · {formatEnumLabel(review.reviewType)}
                </span>
                <span className="flex items-center gap-2">
                  {review.overallRating !== null ? <Badge variant="secondary">Rating {review.overallRating}</Badge> : null}
                  <Badge variant="outline">{formatEnumLabel(review.status)}</Badge>
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Learning</CardTitle>
          <CardDescription>Training hours completed and in progress.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {learningRow ? (
            <>
              <Field label="Completed hours" value={String(learningRow.completedHours)} />
              <Field label="Courses completed" value={String(learningRow.completedCount)} />
              <Field label="In progress" value={String(learningRow.inProgressCount)} />
              <Field label="Assigned" value={String(learningRow.assignedCount)} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {learningResult.ok ? "No learning activity on record." : learningResult.error}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employee relations status</CardTitle>
          <CardDescription>Non-confidential disciplinary cases. Grievances stay a direct employee-HR channel.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {!relationsResult.ok ? (
            <p className="text-sm text-muted-foreground">{relationsResult.error}</p>
          ) : relationsResult.data.cases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No employee relations cases on record.</p>
          ) : (
            relationsResult.data.cases.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm">
                <span>
                  {c.caseNumber} · {formatEnumLabel(c.category)} · {c.subject}
                </span>
                <Badge variant={CASE_STATUS_VARIANT[c.status] ?? "outline"}>{formatEnumLabel(c.status)}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Forms</CardTitle>
          <CardDescription>Forms assigned to this employee.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {!formsResult.ok ? (
            <p className="text-sm text-muted-foreground">{formsResult.error}</p>
          ) : formsResult.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No forms assigned.</p>
          ) : (
            formsResult.data.map((instance) => (
              <div key={instance.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm">
                <span>{instance.formTemplate.title}</span>
                <Badge variant={FORM_STATUS_VARIANT[instance.status]}>{INSTANCE_STATUS_LABELS[instance.status]}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Professional profile</CardTitle>
          <CardDescription>Work experience, education, certifications, and skills.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!profileResult.ok ? (
            <p className="text-sm text-muted-foreground">{profileResult.error}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label="Work experience" value={String(profileResult.data.workExperience.length)} />
                <Field label="Education records" value={String(profileResult.data.education.length)} />
                <Field label="Certifications" value={String(profileResult.data.certifications.length)} />
                <Field label="Skills" value={String(profileResult.data.skills.length)} />
              </div>
              {profileResult.data.skills.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {profileResult.data.skills.map((skill) => (
                    <Badge key={skill.id} variant="secondary">
                      {skill.skill.name}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
