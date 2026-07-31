import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  fetchAvailableExpertise,
  fetchCertificationSummary,
  fetchCertificationsByDepartment,
  fetchEducationByField,
  fetchEducationByInstitution,
  fetchEducationByLevel,
  fetchMostCommonSkills,
  fetchSkillsByDepartment,
} from "@/lib/api/professional-profile"

import { BarList } from "./bar-list"

export default async function ProfessionalProfileAnalyticsPage() {
  const [educationByLevel, educationByInstitution, educationByField, mostCommonSkills, skillsByDepartment, availableExpertise, certSummary, certByDepartment] =
    await Promise.all([
      fetchEducationByLevel(),
      fetchEducationByInstitution(),
      fetchEducationByField(),
      fetchMostCommonSkills(),
      fetchSkillsByDepartment(),
      fetchAvailableExpertise(),
      fetchCertificationSummary(),
      fetchCertificationsByDepartment(),
    ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Workforce Background Analytics</h1>
        <p className="text-sm text-muted-foreground">Education, skills, and certification insights across HR-verified profile records.</p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Education Analysis</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">By Education Level</CardTitle>
            </CardHeader>
            <CardContent>{educationByLevel.ok ? <BarList items={educationByLevel.data} formatLabel /> : <CardDescription>{educationByLevel.error}</CardDescription>}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">By Institution</CardTitle>
            </CardHeader>
            <CardContent>{educationByInstitution.ok ? <BarList items={educationByInstitution.data} /> : <CardDescription>{educationByInstitution.error}</CardDescription>}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">By Field of Study</CardTitle>
            </CardHeader>
            <CardContent>{educationByField.ok ? <BarList items={educationByField.data} /> : <CardDescription>{educationByField.error}</CardDescription>}</CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Skills Analysis</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Most Common Skills</CardTitle>
            </CardHeader>
            <CardContent>{mostCommonSkills.ok ? <BarList items={mostCommonSkills.data} /> : <CardDescription>{mostCommonSkills.error}</CardDescription>}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Available Expertise</CardTitle>
              <CardDescription>Skills with at least one employee, ranked by how many have it.</CardDescription>
            </CardHeader>
            <CardContent>
              {availableExpertise.ok ? (
                <ul className="flex flex-wrap gap-1.5">
                  {availableExpertise.data.slice(0, 30).map((item) => (
                    <Badge key={item.skill} variant="outline">
                      {item.skill} ({item.employeeCount})
                    </Badge>
                  ))}
                </ul>
              ) : (
                <CardDescription>{availableExpertise.error}</CardDescription>
              )}
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Skills by Department</CardTitle>
              <CardDescription>
                Coverage, not a true gap analysis — this app has no defined "required skills per role" to diff
                against yet, so this shows what departments actually have on record.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {skillsByDepartment.ok ? (
                skillsByDepartment.data.map((dept) => (
                  <div key={dept.department}>
                    <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">{dept.department}</p>
                    <BarList items={dept.topSkills} />
                  </div>
                ))
              ) : (
                <CardDescription>{skillsByDepartment.error}</CardDescription>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Certification Analysis</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Status Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {certSummary.ok ? (
                <div className="flex flex-col gap-2 text-sm">
                  <p>
                    Active: <span className="font-medium text-foreground">{certSummary.data.active}</span>
                  </p>
                  <p>
                    Expired: <span className="font-medium text-foreground">{certSummary.data.expired}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Expiring within {certSummary.data.expiringWindowDays} days: {certSummary.data.expiringSoon.length}</p>
                </div>
              ) : (
                <CardDescription>{certSummary.error}</CardDescription>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">By Department</CardTitle>
            </CardHeader>
            <CardContent>{certByDepartment.ok ? <BarList items={certByDepartment.data} /> : <CardDescription>{certByDepartment.error}</CardDescription>}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Expiring Soon</CardTitle>
            </CardHeader>
            <CardContent>
              {certSummary.ok && certSummary.data.expiringSoon.length > 0 ? (
                <ul className="flex flex-col gap-1.5 text-sm">
                  {certSummary.data.expiringSoon.slice(0, 10).map((cert) => (
                    <li key={cert.id} className="flex items-center justify-between">
                      <span>
                        {cert.name} — {cert.employee.firstName} {cert.employee.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">{cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString("en-GB") : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nothing expiring soon.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
