import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchJobPosting, fetchPostingBoard, fetchPostingSteps } from "@/lib/api/recruitment"
import { getSession } from "@/lib/get-session"

import { BoardCard } from "./board-card"

export default async function HiringBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [postingResult, boardResult, stepsResult] = await Promise.all([
    fetchJobPosting(id, actingEmployeeId),
    fetchPostingBoard(id, actingEmployeeId),
    fetchPostingSteps(id, actingEmployeeId),
  ])
  if (!postingResult.ok) {
    if (postingResult.status === 404) notFound()
    return <p className="text-sm text-destructive">{postingResult.error}</p>
  }
  if (!boardResult.ok || !stepsResult.ok) return <p className="text-sm text-destructive">Couldn&apos;t load the hiring board.</p>

  const posting = postingResult.data
  const board = boardResult.data
  const steps = stepsResult.data.steps
  const apps = board.applications
  const name = (a: (typeof apps)[number]) => `${a.candidate.firstName} ${a.candidate.lastName}`

  // Active apps sit in the column of their current step; those who passed every
  // step and aren't hired/rejected are the final selection (offer & onboarding).
  const terminal = ["REJECTED", "WITHDRAWN"]
  const selected = apps.filter((a) => !terminal.includes(a.status) && a.status !== "HIRED" && a.currentStageId === null && a.stageInstances.length > 0)
  const hired = apps.filter((a) => a.status === "HIRED")
  const rejected = apps.filter((a) => terminal.includes(a.status))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/admin/recruitment/job-postings/${id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to posting
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Hiring board · {posting.postingTitle}</h1>
            <p className="text-sm text-muted-foreground">Shortlist step by step until the final selection, then offer and onboarding.</p>
          </div>
          <Badge variant={board.requisitionStatus === "FILLED" ? "success" : "outline"}>
            {board.requisitionStatus === "FILLED" ? "Position filled" : `Hired ${board.hired} of ${board.vacancies}`}
          </Badge>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {steps.map((step, index) => {
          const column = apps.filter((a) => a.currentStageId === step.id && !terminal.includes(a.status))
          return (
            <Card key={step.id} className="w-64 shrink-0 bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {index + 1}. {step.name}
                </CardTitle>
                <CardDescription>{column.length} candidate(s)</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {column.map((a) => (
                  <BoardCard
                    key={a.id}
                    applicationId={a.id}
                    actingEmployeeId={actingEmployeeId}
                    name={name(a)}
                    score={a.overallScore}
                    stepName={step.name}
                    isLastStep={index === steps.length - 1}
                    onHold={a.stageInstances.find((s) => s.stageId === step.id)?.status === "ON_HOLD"}
                  />
                ))}
              </CardContent>
            </Card>
          )
        })}

        <Card className="w-64 shrink-0 border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Final selection</CardTitle>
            <CardDescription>Make an offer, then onboard.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {selected.map((a) => (
              <Link key={a.id} href={`/admin/recruitment/applications/${a.id}`} className="rounded-lg border border-border bg-background p-2.5 text-sm hover:bg-muted/40">
                <span className="font-medium">{name(a)}</span>
                <span className="block text-xs text-muted-foreground">{a.status === "OFFER" ? "Offer stage" : "Selected"} → offer &amp; onboarding</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="w-64 shrink-0 bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Hired</CardTitle>
            <CardDescription>
              {hired.length} of {board.vacancies}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {hired.map((a) => (
              <Link key={a.id} href={`/admin/recruitment/applications/${a.id}`} className="rounded-lg border border-border bg-background p-2.5 text-sm hover:bg-muted/40">
                {name(a)}
                {a.hiredEmployeeNumber ? <span className="block text-xs text-muted-foreground">{a.hiredEmployeeNumber}</span> : null}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {rejected.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Rejected / withdrawn ({rejected.length}): {rejected.map(name).join(", ")}
        </p>
      ) : null}
    </div>
  )
}
