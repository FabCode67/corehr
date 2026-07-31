import { redirect } from "next/navigation"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchFullProfile } from "@/lib/api/professional-profile"
import { getSession } from "@/lib/get-session"

import { AboutSection } from "./about-section"
import { CertificationsSection } from "./certifications-section"
import { EducationSection } from "./education-section"
import { ExperienceSection } from "./experience-section"
import { SkillsSection } from "./skills-section"

export default async function ProfessionalProfilePage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const result = await fetchFullProfile(session.employeeId, session.employeeId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Professional Profile</h1>
        <p className="text-sm text-muted-foreground">
          Maintain your work background, education, certifications, and skills. Education and certification
          records you add are reviewed by HR before they&apos;re marked verified.
        </p>
      </div>

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <AboutSection
            employeeId={session.employeeId}
            professionalSummary={result.data.employee.professionalSummary}
            careerInterests={result.data.employee.careerInterests}
            editable
          />
          <ExperienceSection employeeId={session.employeeId} experience={result.data.workExperience} editable />
          <EducationSection employeeId={session.employeeId} actingEmployeeId={session.employeeId} education={result.data.education} editable />
          <CertificationsSection employeeId={session.employeeId} actingEmployeeId={session.employeeId} certifications={result.data.certifications} editable />
          <SkillsSection employeeId={session.employeeId} actingEmployeeId={session.employeeId} skills={result.data.skills} editable />
        </>
      )}
    </div>
  )
}
