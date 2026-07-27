import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CASE_STATUS_BADGE_VARIANT,
  CASE_STATUS_LABELS,
  fetchDisciplinaryCases,
  fetchGrievances,
  GRIEVANCE_STATUS_LABELS,
  type GrievanceStatus,
} from "@/lib/api/employee-relations"
import { getSession } from "@/lib/get-session"

const GRIEVANCE_STATUS_VARIANT: Record<GrievanceStatus, "outline" | "success" | "secondary" | "destructive" | "default"> = {
  SUBMITTED: "outline",
  UNDER_REVIEW: "default",
  RESOLVED: "success",
  CLOSED: "secondary",
}

export default async function StaffEmployeeRelationsPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [casesResult, grievancesResult] = await Promise.all([
    fetchDisciplinaryCases({ employeeId: actingEmployeeId }, actingEmployeeId),
    fetchGrievances({ employeeId: actingEmployeeId }, actingEmployeeId),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Employee Relations</h1>
          <p className="text-sm text-muted-foreground">Your disciplinary case history, grievances, and appeal status.</p>
        </div>
        <Link href="/staff/employee-relations/grievances/new" className={buttonVariants({ size: "sm" })}>
          Submit a grievance
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My disciplinary cases</CardTitle>
          <CardDescription>Any case involving you — including sanctions, investigations, and appeal status.</CardDescription>
        </CardHeader>
        <CardContent>
          {!casesResult.ok ? (
            <p className="text-sm text-destructive">{casesResult.error}</p>
          ) : casesResult.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have no disciplinary cases on record.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {casesResult.data.map((disciplinaryCase) => (
                <li key={disciplinaryCase.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">
                      {disciplinaryCase.caseNumber} — {disciplinaryCase.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">Reported {new Date(disciplinaryCase.dateReported).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={CASE_STATUS_BADGE_VARIANT[disciplinaryCase.status]}>{CASE_STATUS_LABELS[disciplinaryCase.status]}</Badge>
                    <Link href={`/staff/employee-relations/cases/${disciplinaryCase.id}`} className="text-xs font-medium text-primary hover:underline">
                      View
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My grievances</CardTitle>
          <CardDescription>Only you and authorized HR personnel can see these.</CardDescription>
        </CardHeader>
        <CardContent>
          {!grievancesResult.ok ? (
            <p className="text-sm text-destructive">{grievancesResult.error}</p>
          ) : grievancesResult.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven&apos;t submitted any grievances.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {grievancesResult.data.map((grievance) => (
                <li key={grievance.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">
                      {grievance.grievanceNumber} — {grievance.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">Submitted {new Date(grievance.dateSubmitted).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={GRIEVANCE_STATUS_VARIANT[grievance.status]}>{GRIEVANCE_STATUS_LABELS[grievance.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
