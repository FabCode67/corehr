import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MandatoryTrainingBanner } from "@/components/portal/mandatory-training-banner"
import { fetchEmployeeLearningProfile, fetchLearningPlan } from "@/lib/api/learning"
import { getSession } from "@/lib/get-session"

import { AssignmentList } from "./assignment-list"

export default async function MyLearningPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [planResult, profileResult] = await Promise.all([
    fetchLearningPlan(actingEmployeeId, actingEmployeeId),
    fetchEmployeeLearningProfile(actingEmployeeId),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Learning</h1>
        <p className="text-sm text-muted-foreground">
          Your assigned, mandatory, and recommended training — confirm enrollment, track progress, and upload
          certificates.
        </p>
      </div>

      <MandatoryTrainingBanner actingEmployeeId={actingEmployeeId} />

      {profileResult.ok ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your learning profile</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Total assigned</p>
              <p className="font-medium text-foreground">{profileResult.data.totalAssigned}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="font-medium text-foreground">{profileResult.data.totalCompleted}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Certificates earned</p>
              <p className="font-medium text-foreground">{profileResult.data.certificatesEarned}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Training hours</p>
              <p className="font-medium text-foreground">{profileResult.data.totalTrainingHours}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!planResult.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{planResult.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {planResult.data.overdue.length > 0 ? (
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="text-base text-destructive">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <AssignmentList assignments={planResult.data.overdue} />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mandatory courses</CardTitle>
              <CardDescription>Required by regulation or bank policy — e.g. AML, KYC, Code of Conduct.</CardDescription>
            </CardHeader>
            <CardContent>
              <AssignmentList assignments={planResult.data.mandatory} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">In progress</CardTitle>
            </CardHeader>
            <CardContent>
              <AssignmentList assignments={planResult.data.inProgress} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              <AssignmentList assignments={planResult.data.upcoming} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommended</CardTitle>
              <CardDescription>Courses your manager or HR has suggested, with a comment.</CardDescription>
            </CardHeader>
            <CardContent>
              <AssignmentList assignments={planResult.data.recommended} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Optional</CardTitle>
            </CardHeader>
            <CardContent>
              <AssignmentList assignments={planResult.data.optional} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Completed & certificates</CardTitle>
            </CardHeader>
            <CardContent>
              <AssignmentList assignments={planResult.data.completed} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
