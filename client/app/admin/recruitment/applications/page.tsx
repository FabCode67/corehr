import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { APPLICATION_PIPELINE, APPLICATION_STATUS_LABELS, fetchApplications } from "@/lib/api/recruitment"
import { getSession } from "@/lib/get-session"

import { RecruitmentTabs } from "../recruitment-tabs"

export default async function ApplicationsPipelinePage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""
  const result = await fetchApplications({}, actingEmployeeId)
  const applications = result.ok ? result.data : []

  const columns = APPLICATION_PIPELINE.map((status) => ({
    status,
    applications: applications.filter((application) => application.status === status),
  }))
  const rejectedOrWithdrawn = applications.filter((application) => application.status === "REJECTED" || application.status === "WITHDRAWN")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Recruitment Management</h1>
        <p className="text-sm text-muted-foreground">The candidate pipeline — every active application, grouped by stage.</p>
      </div>

      <RecruitmentTabs />

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : applications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No applications yet. Record one from a published job posting.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-3 lg:grid-cols-6">
            {columns.map((column) => (
              <div key={column.status} className="flex min-w-48 flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">{APPLICATION_STATUS_LABELS[column.status]}</p>
                  <Badge variant="outline">{column.applications.length}</Badge>
                </div>
                <div className="flex flex-col gap-2">
                  {column.applications.map((application) => (
                    <Link
                      key={application.id}
                      href={`/admin/recruitment/applications/${application.id}`}
                      className="rounded-lg border border-border bg-card p-3 text-sm shadow-xs hover:bg-muted/30"
                    >
                      <p className="font-medium text-foreground">
                        {application.candidate.firstName} {application.candidate.lastName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{application.jobPosting.postingTitle}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {rejectedOrWithdrawn.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rejected / withdrawn ({rejectedOrWithdrawn.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {rejectedOrWithdrawn.map((application) => (
                    <li key={application.id} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">
                        {application.candidate.firstName} {application.candidate.lastName} — {application.jobPosting.postingTitle}
                      </span>
                      <Link href={`/admin/recruitment/applications/${application.id}`} className="text-xs font-medium text-primary hover:underline">
                        View
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  )
}
