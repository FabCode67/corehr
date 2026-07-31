import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatEnumLabel } from "@/lib/api/employees"
import { fetchPendingCertifications, fetchPendingEducation, fetchPendingInstitutions } from "@/lib/api/professional-profile"
import { reviewCertification, reviewEducationRecord, reviewInstitution } from "@/lib/api/professional-profile-actions"
import { getSession } from "@/lib/get-session"

import { ReviewActions } from "./review-actions"

export default async function ProfessionalProfileReviewPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [educationResult, certResult, institutionResult] = await Promise.all([
    fetchPendingEducation(),
    fetchPendingCertifications(),
    fetchPendingInstitutions(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Professional Profile — HR Review</h1>
        <p className="text-sm text-muted-foreground">
          Employee-submitted education, certification, and manually-added institution records awaiting verification.
        </p>
        <Link href="/admin/professional-profile/analytics" className="mt-1 inline-block text-xs font-medium text-primary hover:underline">
          View workforce background analytics →
        </Link>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Education Records</h2>
        {!educationResult.ok ? (
          <Card className="border-dashed border-destructive/40">
            <CardHeader>
              <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
              <CardDescription>{educationResult.error}</CardDescription>
            </CardHeader>
          </Card>
        ) : educationResult.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing pending review.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {educationResult.data.map((record) => (
              <Card key={record.id}>
                <CardContent className="flex flex-col gap-2 pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{record.title}</span>
                    <Badge variant="secondary">{formatEnumLabel(record.type)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {record.employee?.firstName} {record.employee?.lastName} · {record.institution}
                    {record.country ? `, ${record.country}` : ""}
                  </p>
                  {record.certificateUrl ? (
                    <a href={record.certificateUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                      View uploaded certificate
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">No document uploaded.</p>
                  )}
                  <ReviewActions actingEmployeeId={actingEmployeeId} onReview={reviewEducationRecord.bind(null, record.id)} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Certifications</h2>
        {!certResult.ok ? (
          <Card className="border-dashed border-destructive/40">
            <CardHeader>
              <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
              <CardDescription>{certResult.error}</CardDescription>
            </CardHeader>
          </Card>
        ) : certResult.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing pending review.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {certResult.data.map((cert) => (
              <Card key={cert.id}>
                <CardContent className="flex flex-col gap-2 pt-4">
                  <span className="font-medium text-foreground">{cert.name}</span>
                  <p className="text-sm text-muted-foreground">
                    {cert.employee?.firstName} {cert.employee?.lastName} · Issued by {cert.issuer}
                    {cert.certificateNumber ? ` · #${cert.certificateNumber}` : ""}
                  </p>
                  {cert.certificateUrl ? (
                    <a href={cert.certificateUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                      View uploaded certificate
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">No document uploaded.</p>
                  )}
                  <ReviewActions actingEmployeeId={actingEmployeeId} onReview={reviewCertification.bind(null, cert.id)} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Manually-Added Institutions</h2>
        {!institutionResult.ok ? (
          <Card className="border-dashed border-destructive/40">
            <CardHeader>
              <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
              <CardDescription>{institutionResult.error}</CardDescription>
            </CardHeader>
          </Card>
        ) : institutionResult.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing pending review.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {institutionResult.data.map((institution) => (
              <Card key={institution.id}>
                <CardContent className="flex flex-col gap-2 pt-4">
                  <span className="font-medium text-foreground">{institution.name}</span>
                  <p className="text-sm text-muted-foreground">
                    {[institution.city, institution.country].filter(Boolean).join(", ") || "No location given"}
                    {institution.website ? ` · ${institution.website}` : ""}
                  </p>
                  <ReviewActions actingEmployeeId={actingEmployeeId} onReview={reviewInstitution.bind(null, institution.id)} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
