import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchAssignmentsForEmployee, fetchOnboardingProgress } from "@/lib/api/onboarding-documents"
import { getSession } from "@/lib/get-session"

import { OnboardingDocumentList } from "./onboarding-document-list"

export default async function MyOnboardingPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [assignmentsResult, progressResult] = await Promise.all([
    fetchAssignmentsForEmployee(actingEmployeeId, actingEmployeeId),
    fetchOnboardingProgress(actingEmployeeId),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Onboarding</h1>
        <p className="text-sm text-muted-foreground">Upload the documents HR has requested and track their review status.</p>
      </div>

      {progressResult.ok && progressResult.data.total > 0 ? (
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 pt-6 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Documents required</p>
              <p className="font-medium text-foreground">{progressResult.data.total}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="font-medium text-foreground">{progressResult.data.approved}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="font-medium text-foreground">{progressResult.data.remaining}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="font-medium text-foreground">{progressResult.data.percentageCompleted}%</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!assignmentsResult.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{assignmentsResult.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : assignmentsResult.data.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Nothing assigned yet</CardTitle>
            <CardDescription>HR hasn&apos;t requested any onboarding documents from you.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your documents</CardTitle>
          </CardHeader>
          <CardContent>
            <OnboardingDocumentList assignments={assignmentsResult.data} actingEmployeeId={actingEmployeeId} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
