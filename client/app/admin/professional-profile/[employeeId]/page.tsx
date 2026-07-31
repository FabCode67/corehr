import { notFound } from "next/navigation"

import { AboutSection } from "@/app/staff/professional-profile/about-section"
import { CertificationsSection } from "@/app/staff/professional-profile/certifications-section"
import { EducationSection } from "@/app/staff/professional-profile/education-section"
import { ExperienceSection } from "@/app/staff/professional-profile/experience-section"
import { SkillsSection } from "@/app/staff/professional-profile/skills-section"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchFullProfile } from "@/lib/api/professional-profile"
import { getSession } from "@/lib/get-session"

/**
 * Read-only "view someone else's professional profile" — the manager/HR
 * side of the spec's "Managers can view approved employee profiles based
 * on permissions". See ProfileService.getFullProfile()'s doc comment for
 * exactly what "approved" means here (VERIFIED-only education/certification
 * records unless the viewer is HR admin or the profile owner themselves).
 */
export default async function EmployeeProfessionalProfilePage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  const session = await getSession()
  const result = await fetchFullProfile(employeeId, session?.employeeId)

  if (!result.ok) {
    if (result.status === 404) notFound()
    return (
      <Card className="border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const { employee, isOwnerOrAdmin } = result.data
  const editable = session?.employeeId === employeeId

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {employee.firstName} {employee.lastName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {employee.position?.title ?? "Not yet assigned"}
          {employee.position?.department ? ` · ${employee.position.department.name}` : ""}
        </p>
        {!isOwnerOrAdmin ? <p className="mt-1 text-xs text-muted-foreground">Showing HR-verified records only.</p> : null}
      </div>

      <AboutSection employeeId={employeeId} professionalSummary={employee.professionalSummary} careerInterests={employee.careerInterests} editable={editable} />
      <ExperienceSection employeeId={employeeId} experience={result.data.workExperience} editable={editable} />
      <EducationSection employeeId={employeeId} actingEmployeeId={session?.employeeId ?? ""} education={result.data.education} editable={editable} />
      <CertificationsSection employeeId={employeeId} actingEmployeeId={session?.employeeId ?? ""} certifications={result.data.certifications} editable={editable} />
      <SkillsSection employeeId={employeeId} actingEmployeeId={session?.employeeId ?? ""} skills={result.data.skills} editable={editable} />
    </div>
  )
}
