import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmployee } from "@/lib/api/employees"
import { fetchEmployeeLearningProfile, fetchLearningPlan } from "@/lib/api/learning"
import { getSession } from "@/lib/get-session"

import { AssignmentList } from "./assignment-list"

export default async function LearningPlanPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [employeeResult, planResult, profileResult] = await Promise.all([
    fetchEmployee(employeeId),
    fetchLearningPlan(employeeId, actingEmployeeId),
    fetchEmployeeLearningProfile(employeeId),
  ])

  if (!employeeResult.ok) {
    if (employeeResult.status === 404) notFound()
    return (
      <Card className="max-w-2xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t load this employee</CardTitle>
          <CardDescription>{employeeResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const employee = employeeResult.data

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/learning/plans"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to learning plans
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          {employee.firstName} {employee.lastName}&apos;s learning plan
        </h1>
        <p className="text-sm text-muted-foreground">{employee.employeeNumber}</p>
      </div>

      {profileResult.ok ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Learning profile</CardTitle>
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
              <p className="text-xs text-muted-foreground">Mandatory completed</p>
              <p className="font-medium text-foreground">{profileResult.data.mandatoryCompleted}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Certificates earned</p>
              <p className="font-medium text-foreground">{profileResult.data.certificatesEarned}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Training hours</p>
              <p className="font-medium text-foreground">{profileResult.data.totalTrainingHours}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Training cost</p>
              <p className="font-medium text-foreground">RWF {profileResult.data.totalTrainingCost.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Currently in progress</p>
              <p className="font-medium text-foreground">{profileResult.data.currentlyInProgress}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!planResult.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t load the learning plan</CardTitle>
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
              <CardTitle className="text-base">Mandatory</CardTitle>
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
              <CardTitle className="text-base">Completed</CardTitle>
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
