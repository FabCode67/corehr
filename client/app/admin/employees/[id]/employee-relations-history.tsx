import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CASE_STATUS_BADGE_VARIANT,
  CASE_STATUS_LABELS,
  fetchEmployeeRelationsHistory,
  GRIEVANCE_STATUS_LABELS,
  type GrievanceStatus,
} from "@/lib/api/employee-relations"

const GRIEVANCE_STATUS_VARIANT: Record<GrievanceStatus, "outline" | "success" | "secondary" | "destructive" | "default"> = {
  SUBMITTED: "outline",
  UNDER_REVIEW: "default",
  RESOLVED: "success",
  CLOSED: "secondary",
}

/**
 * Permanent Employee Relations history for one employee profile — every
 * disciplinary case (with its investigations/sanctions/appeals) and
 * grievance, never deleted even after exit (see schema module doc
 * comment). Grievances only render if the acting viewer is HR or the
 * employee themselves — DisciplinaryCasesService.findHistoryForEmployee()
 * returns an empty grievances array for anyone else (e.g. a line manager),
 * so this component doesn't need its own extra filtering on top of that.
 */
export async function EmployeeRelationsHistory({ employeeId, actingEmployeeId }: { employeeId: string; actingEmployeeId: string }) {
  const result = await fetchEmployeeRelationsHistory(employeeId, actingEmployeeId)

  if (!result.ok) {
    // A 403 just means this viewer isn't permitted to see this employee's ER
    // history (e.g. an unrelated line manager) — quietly omit the section
    // rather than showing an error, since the rest of the profile is fine.
    if (result.status === 403) return null
    return (
      <Card className="border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Employee Relations history</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const { cases, grievances } = result.data

  if (cases.length === 0 && grievances.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Employee Relations history</CardTitle>
        <CardDescription>Every disciplinary case and grievance on record — retained permanently, even after exit.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {cases.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">Disciplinary cases</p>
            {cases.map((disciplinaryCase) => (
              <div key={disciplinaryCase.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">
                    {disciplinaryCase.caseNumber} — {disciplinaryCase.subject}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Reported {new Date(disciplinaryCase.dateReported).toLocaleDateString()}
                    {disciplinaryCase.sanctions.length > 0 ? ` · ${disciplinaryCase.sanctions.length} sanction(s)` : ""}
                    {disciplinaryCase.appeals.length > 0 ? ` · ${disciplinaryCase.appeals.length} appeal(s)` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {disciplinaryCase.isConfidential ? <Badge variant="secondary">Confidential</Badge> : null}
                  <Badge variant={CASE_STATUS_BADGE_VARIANT[disciplinaryCase.status]}>{CASE_STATUS_LABELS[disciplinaryCase.status]}</Badge>
                  <Link href={`/admin/employee-relations/cases/${disciplinaryCase.id}`} className="text-xs font-medium text-primary hover:underline">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {grievances.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">Grievances</p>
            {grievances.map((grievance) => (
              <div key={grievance.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">
                    {grievance.grievanceNumber} — {grievance.subject}
                  </p>
                  <p className="text-xs text-muted-foreground">Submitted {new Date(grievance.dateSubmitted).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={GRIEVANCE_STATUS_VARIANT[grievance.status]}>{GRIEVANCE_STATUS_LABELS[grievance.status]}</Badge>
                  <Link href={`/admin/employee-relations/grievances/${grievance.id}`} className="text-xs font-medium text-primary hover:underline">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
