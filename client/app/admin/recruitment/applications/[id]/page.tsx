import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmployees } from "@/lib/api/employees"
import { fetchBands } from "@/lib/api/bands"
import {
  APPLICATION_STATUS_LABELS,
  fetchApplication,
  fetchApplicationPipeline,
  fetchAssessments,
  fetchBackgroundChecks,
  fetchInterviews,
  fetchOffers,
  fetchOnboardingTasks,
} from "@/lib/api/recruitment"
import { getSession } from "@/lib/get-session"

import { AssessmentsSection } from "./assessments-section"
import { BackgroundChecksSection } from "./background-checks-section"
import { InterviewsSection } from "./interviews-section"
import { OfferSection } from "./offer-section"
import { OnboardingSection } from "./onboarding-section"
import { PipelineSection } from "./pipeline-section"
import { ScreeningSection } from "./screening-section"
import { StatusSelect } from "./status-select"

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const applicationResult = await fetchApplication(id, actingEmployeeId)

  if (!applicationResult.ok) {
    if (applicationResult.status === 404) notFound()
    return (
      <Card className="max-w-4xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{applicationResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const application = applicationResult.data

  const [assessmentsResult, interviewsResult, checksResult, offersResult, onboardingResult, employeesResult, bandsResult, pipelineResult] =
    await Promise.all([
      fetchAssessments(id, actingEmployeeId),
      fetchInterviews(id, actingEmployeeId),
      fetchBackgroundChecks(id, actingEmployeeId),
      fetchOffers(id, actingEmployeeId),
      fetchOnboardingTasks(id, actingEmployeeId),
      fetchEmployees(),
      fetchBands(),
      fetchApplicationPipeline(id, actingEmployeeId),
    ])

  const isTerminal = application.status === "HIRED" || application.status === "REJECTED" || application.status === "WITHDRAWN"

  const hasAcceptedOffer = offersResult.ok && offersResult.data.some((offer) => offer.status === "ACCEPTED")

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/admin/recruitment/applications" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to pipeline
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {application.candidate.firstName} {application.candidate.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {application.jobPosting.postingTitle} · Applied {new Date(application.appliedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{APPLICATION_STATUS_LABELS[application.status]}</Badge>
            <StatusSelect applicationId={application.id} actingEmployeeId={actingEmployeeId} status={application.status} />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recruitment Pipeline</CardTitle>
          <CardDescription>The candidate&apos;s progress through this position&apos;s configured interview workflow.</CardDescription>
        </CardHeader>
        <CardContent>
          <PipelineSection
            applicationId={application.id}
            actingEmployeeId={actingEmployeeId}
            instances={pipelineResult.ok ? pipelineResult.data : []}
            isTerminal={isTerminal}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Candidate profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm text-foreground">{application.candidate.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="text-sm text-foreground">{application.candidate.phone}</p>
          </div>
          {application.candidate.cvUrl ? (
            <div>
              <p className="text-xs text-muted-foreground">CV</p>
              <a href={application.candidate.cvUrl} className="text-sm text-primary hover:underline">
                View CV
              </a>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Screening</CardTitle>
        </CardHeader>
        <CardContent>
          <ScreeningSection application={application} actingEmployeeId={actingEmployeeId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          <AssessmentsSection
            applicationId={application.id}
            actingEmployeeId={actingEmployeeId}
            assessments={assessmentsResult.ok ? assessmentsResult.data : []}
            employees={employeesResult.ok ? employeesResult.data : []}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interviews</CardTitle>
        </CardHeader>
        <CardContent>
          <InterviewsSection
            applicationId={application.id}
            actingEmployeeId={actingEmployeeId}
            interviews={interviewsResult.ok ? interviewsResult.data : []}
            employees={employeesResult.ok ? employeesResult.data : []}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Background checks</CardTitle>
        </CardHeader>
        <CardContent>
          <BackgroundChecksSection
            applicationId={application.id}
            actingEmployeeId={actingEmployeeId}
            checks={checksResult.ok ? checksResult.data : []}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Offer</CardTitle>
        </CardHeader>
        <CardContent>
          <OfferSection
            applicationId={application.id}
            actingEmployeeId={actingEmployeeId}
            offers={offersResult.ok ? offersResult.data : []}
            bands={bandsResult.ok ? bandsResult.data : []}
          />
        </CardContent>
      </Card>

      {hasAcceptedOffer || application.hiredEmployeeNumber ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Onboarding</CardTitle>
            <CardDescription>Once every item is checked, complete onboarding to create the employee record.</CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingSection
              applicationId={application.id}
              actingEmployeeId={actingEmployeeId}
              tasks={onboardingResult.ok ? onboardingResult.data : []}
              hiredEmployeeNumber={application.hiredEmployeeNumber}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
