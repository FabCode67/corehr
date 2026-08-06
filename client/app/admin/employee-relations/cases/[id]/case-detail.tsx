import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Download } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmployees } from "@/lib/api/employees"
import {
  CASE_STATUS_BADGE_VARIANT,
  CASE_STATUS_LABELS,
  disciplinaryCasePdfUrl,
  fetchDisciplinaryCase,
  fetchSanctionTypes,
  formatErEnum,
} from "@/lib/api/employee-relations"

import { CaseActions } from "./case-actions"
import { DecideAppealForm, SubmitAppealForm } from "./appeal-panel"
import { CompleteInvestigationForm, InvestigationCard, OpenInvestigationForm } from "./investigation-panel"
import { MeetingForm } from "./meeting-form"
import { SanctionForm } from "./sanction-form"

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

/**
 * Shared case detail view — rendered from both the admin portal
 * (/admin/employee-relations/cases/[id]) and the staff self-service portal
 * (/staff/employee-relations/cases/[id]), since either an HR admin or the
 * employee involved needs to reach the same case (mirrors Forms
 * Management's InstanceDetail pattern). `isHr` gates every mutation that
 * only HR should perform (submit/close case, schedule meetings, open/
 * complete investigations, issue sanctions, decide appeals) — the API
 * itself enforces the real access rules, this only hides controls the
 * caller couldn't use anyway.
 */
export async function CaseDetail({
  id,
  actingEmployeeId,
  isHr,
  backHref,
  backLabel,
}: {
  id: string
  actingEmployeeId: string
  isHr: boolean
  backHref: string
  backLabel: string
}) {
  const [caseResult, employeesResult, sanctionTypesResult] = await Promise.all([
    fetchDisciplinaryCase(id, actingEmployeeId),
    fetchEmployees(),
    fetchSanctionTypes(),
  ])

  if (!caseResult.ok) {
    if (caseResult.status === 404 || caseResult.status === 403) notFound()
    return (
      <Card className="max-w-4xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{caseResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const disciplinaryCase = caseResult.data
  const employees = employeesResult.ok ? employeesResult.data : []
  const sanctionTypes = sanctionTypesResult.ok ? sanctionTypesResult.data : []
  const isOwner = disciplinaryCase.employeeId === actingEmployeeId
  const canAppeal = isOwner && (disciplinaryCase.status === "SANCTION_ISSUED" || disciplinaryCase.status === "CLOSED")

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link href={backHref} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          {backLabel}
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-foreground">{disciplinaryCase.caseNumber}</h1>
          <div className="flex items-center gap-1.5">
            {disciplinaryCase.isConfidential ? <Badge variant="secondary">Confidential</Badge> : null}
            <Badge variant={CASE_STATUS_BADGE_VARIANT[disciplinaryCase.status]}>{CASE_STATUS_LABELS[disciplinaryCase.status]}</Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{disciplinaryCase.subject}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employee</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Name" value={`${disciplinaryCase.employee.firstName} ${disciplinaryCase.employee.lastName}`} />
          <Field label="Employee number" value={disciplinaryCase.employee.employeeNumber} />
          <Field label="Employment status" value={formatErEnum(disciplinaryCase.employee.employmentStatus)} />
          <Field label="Department" value={disciplinaryCase.employee.position?.department.name ?? "—"} />
          <Field label="Unit" value={disciplinaryCase.employee.position?.unit?.name ?? "—"} />
          <Field label="Position" value={disciplinaryCase.employee.position?.title ?? "—"} />
          <Field label="Branch" value={disciplinaryCase.employee.branch?.name ?? "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Case details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Reported by" value={`${disciplinaryCase.reportedBy.firstName} ${disciplinaryCase.reportedBy.lastName}`} />
          <Field label="Date reported" value={new Date(disciplinaryCase.dateReported).toLocaleDateString()} />
          <Field label="Incident date" value={new Date(disciplinaryCase.incidentDate).toLocaleDateString()} />
          <Field label="Incident location" value={disciplinaryCase.incidentLocation ?? "—"} />
          <Field label="Category" value={formatErEnum(disciplinaryCase.category)} />
          <Field label="Investigation required" value={disciplinaryCase.investigationRequired ? "Yes" : "No"} />
          <div className="sm:col-span-2">
            <Field label="Description" value={disciplinaryCase.description} />
          </div>
          {disciplinaryCase.witnesses.length > 0 ? (
            <div className="sm:col-span-2">
              <Field label="Witnesses" value={disciplinaryCase.witnesses.join(", ")} />
            </div>
          ) : null}
          {disciplinaryCase.closedAt ? <Field label="Closed" value={new Date(disciplinaryCase.closedAt).toLocaleDateString()} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <a href={disciplinaryCasePdfUrl(disciplinaryCase.id, actingEmployeeId)} className={buttonVariants({ size: "sm", variant: "outline" })}>
            <Download className="mr-1 size-3.5" /> Download case record (PDF)
          </a>
          {isHr ? <CaseActions caseId={disciplinaryCase.id} actingEmployeeId={actingEmployeeId} status={disciplinaryCase.status} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Disciplinary meetings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {disciplinaryCase.meetings.length === 0 ? <p className="text-sm text-muted-foreground">No meetings scheduled yet.</p> : null}
          {disciplinaryCase.meetings.map((meeting) => (
            <div key={meeting.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="font-medium text-foreground">{meeting.subject || "Disciplinary meeting"}</p>
                <p className="text-xs text-muted-foreground">Scheduled on {new Date(meeting.createdAt).toLocaleString()}</p>
              </div>
              <p className="text-xs text-muted-foreground">{new Date(meeting.scheduledAt).toLocaleString()}</p>
              {meeting.location ? <p className="text-xs text-muted-foreground">{meeting.location}</p> : null}
              {meeting.notes ? <p className="mt-1 text-sm text-foreground">{meeting.notes}</p> : null}
              {meeting.invitees.length > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Invited: {meeting.invitees.map((invitee) => `${invitee.employee.firstName} ${invitee.employee.lastName}`).join(", ")}
                </p>
              ) : null}
            </div>
          ))}
          {isHr ? (
            <MeetingForm
              caseId={disciplinaryCase.id}
              createdById={actingEmployeeId}
              employees={employees.filter((employee) => employee.employeeNumber !== disciplinaryCase.employeeId)}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Investigations</CardTitle>
          <CardDescription>Permanently linked to this case.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {disciplinaryCase.investigations.length === 0 ? <p className="text-sm text-muted-foreground">No investigations opened.</p> : null}
          {disciplinaryCase.investigations.map((investigation) => (
            <div key={investigation.id} className="flex flex-col gap-2">
              <InvestigationCard investigation={investigation} />
              {isHr && investigation.status === "IN_PROGRESS" ? (
                <CompleteInvestigationForm caseId={disciplinaryCase.id} investigation={investigation} actingEmployeeId={actingEmployeeId} />
              ) : null}
            </div>
          ))}
          {isHr && disciplinaryCase.status === "UNDER_INVESTIGATION" ? (
            <OpenInvestigationForm caseId={disciplinaryCase.id} actingEmployeeId={actingEmployeeId} employees={employees} />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sanctions</CardTitle>
          <CardDescription>Permanent sanction history for this employee.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {disciplinaryCase.sanctions.length === 0 ? <p className="text-sm text-muted-foreground">No sanctions issued.</p> : null}
          {disciplinaryCase.sanctions.map((sanction) => (
            <div key={sanction.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">{sanction.sanctionType.name}</p>
                <span className="text-xs text-muted-foreground">Effective {new Date(sanction.effectiveDate).toLocaleDateString()}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Issued by {sanction.issuedBy.firstName} {sanction.issuedBy.lastName} on {new Date(sanction.dateOfSanction).toLocaleDateString()}
                {sanction.approvalAuthority ? ` · Approved by ${sanction.approvalAuthority.firstName} ${sanction.approvalAuthority.lastName}` : ""}
              </p>
              <p className="mt-2 text-sm text-foreground">{sanction.reason}</p>
              {sanction.comments ? <p className="mt-1 text-xs text-muted-foreground">{sanction.comments}</p> : null}
            </div>
          ))}
          {isHr && disciplinaryCase.status === "PENDING_DECISION" ? (
            <SanctionForm caseId={disciplinaryCase.id} actingEmployeeId={actingEmployeeId} sanctionTypes={sanctionTypes} employees={employees} />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appeals</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {disciplinaryCase.appeals.length === 0 ? <p className="text-sm text-muted-foreground">No appeals filed.</p> : null}
          {disciplinaryCase.appeals.map((appeal) => (
            <div key={appeal.id} className="flex flex-col gap-2">
              <div className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">Filed {new Date(appeal.appealDate).toLocaleDateString()}</p>
                  <Badge variant={appeal.status === "DECIDED" ? "success" : "default"}>{appeal.status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-1 text-sm text-foreground">{appeal.appealReason}</p>
                {appeal.outcome ? (
                  <p className="mt-2 text-sm text-foreground">
                    <span className="text-muted-foreground">Outcome: </span>
                    {formatErEnum(appeal.outcome)}
                    {appeal.decidedBy ? ` — ${appeal.decidedBy.firstName} ${appeal.decidedBy.lastName}` : ""}
                    {appeal.decisionDate ? ` on ${new Date(appeal.decisionDate).toLocaleDateString()}` : ""}
                  </p>
                ) : null}
                {appeal.decisionComments ? <p className="mt-1 text-xs text-muted-foreground">{appeal.decisionComments}</p> : null}
              </div>
              {isHr && appeal.status !== "DECIDED" ? (
                <DecideAppealForm caseId={disciplinaryCase.id} appealId={appeal.id} actingEmployeeId={actingEmployeeId} />
              ) : null}
            </div>
          ))}
          {canAppeal ? <SubmitAppealForm caseId={disciplinaryCase.id} actingEmployeeId={actingEmployeeId} /> : null}
        </CardContent>
      </Card>
    </div>
  )
}
