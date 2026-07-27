import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { APPLICATION_STATUS_LABELS, fetchCandidate } from "@/lib/api/recruitment"

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await fetchCandidate(id)

  if (!result.ok) {
    if (result.status === 404) notFound()
    return (
      <Card className="max-w-3xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const candidate = result.data

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/admin/recruitment/candidates"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to candidates
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          {candidate.firstName} {candidate.lastName}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" value={candidate.email} />
          <Field label="Phone" value={candidate.phone} />
          <Field label="Nationality" value={candidate.nationality} />
          <Field label="CV" value={candidate.cvUrl ? <a href={candidate.cvUrl} className="text-primary hover:underline">View CV</a> : "—"} />
          {candidate.education ? (
            <div className="sm:col-span-2">
              <Field label="Education" value={candidate.education} />
            </div>
          ) : null}
          {candidate.experience ? (
            <div className="sm:col-span-2">
              <Field label="Experience" value={candidate.experience} />
            </div>
          ) : null}
          {candidate.skills ? (
            <div className="sm:col-span-2">
              <Field label="Skills" value={candidate.skills} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Applications</CardTitle>
          <CardDescription>Every posting this candidate has applied to.</CardDescription>
        </CardHeader>
        <CardContent>
          {!candidate.applications || candidate.applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {candidate.applications.map((application) => (
                <li key={application.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="text-foreground">{application.jobPosting.postingTitle}</span>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{APPLICATION_STATUS_LABELS[application.status]}</Badge>
                    <Link href={`/admin/recruitment/applications/${application.id}`} className="text-xs font-medium text-primary hover:underline">
                      View
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
