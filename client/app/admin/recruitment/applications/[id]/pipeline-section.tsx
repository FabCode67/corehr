"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  advanceApplicationStage,
  holdApplicationStage,
  rejectApplicationStage,
  returnApplicationStage,
  submitStageScore,
  withdrawApplicationStage,
} from "@/lib/api/recruitment-actions"
import { APPLICATION_STAGE_STATUS_LABELS, type ApplicationStageInstance } from "@/lib/api/recruitment"

function statusBadgeVariant(status: ApplicationStageInstance["status"]) {
  switch (status) {
    case "PASSED":
      return "success" as const
    case "FAILED":
      return "destructive" as const
    case "ON_HOLD":
      return "destructive" as const
    case "IN_PROGRESS":
      return "secondary" as const
    default:
      return "outline" as const
  }
}

function ScoringForm({ instance, actingEmployeeId }: { instance: ApplicationStageInstance; actingEmployeeId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(instance.scores.map((score) => [score.criterionId, String(score.score)]))
  )
  const [comments, setComments] = useState<Record<string, string>>(() =>
    Object.fromEntries(instance.scores.map((score) => [score.criterionId, score.comments ?? ""]))
  )

  function submit(criterionId: string) {
    const value = Number(scores[criterionId])
    if (Number.isNaN(value)) return
    setError(null)
    startTransition(async () => {
      const result = await submitStageScore(instance.id, criterionId, value, actingEmployeeId, comments[criterionId] || undefined)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
      {instance.stage.scoringCriteria.map((criterion) => {
        const existing = instance.scores.find((score) => score.criterionId === criterion.id)
        return (
          <div key={criterion.id} className="flex flex-wrap items-center gap-2">
            <span className="min-w-32 text-xs text-muted-foreground">
              {criterion.name} <span className="text-muted-foreground/70">(max {criterion.maxScore})</span>
            </span>
            <Input
              type="number"
              min={0}
              max={criterion.maxScore}
              value={scores[criterion.id] ?? ""}
              onChange={(event) => setScores((prev) => ({ ...prev, [criterion.id]: event.target.value }))}
              className="h-8 w-20 text-xs"
            />
            <Input
              placeholder="Comments (optional)"
              value={comments[criterion.id] ?? ""}
              onChange={(event) => setComments((prev) => ({ ...prev, [criterion.id]: event.target.value }))}
              className="h-8 flex-1 text-xs"
            />
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => submit(criterion.id)}>
              {existing ? "Update" : "Save"}
            </Button>
          </div>
        )
      })}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function DecisionControls({ applicationId, actingEmployeeId }: { applicationId: string; actingEmployeeId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState("")
  const [showComments, setShowComments] = useState(false)

  function run(action: (id: string, actingId: string, notes?: string) => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action(applicationId, actingEmployeeId, comments || undefined)
      if (result?.error) {
        setError(result.error)
        return
      }
      setComments("")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => run(advanceApplicationStage)}>
          <Check className="size-3.5" />
          Advance
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(returnApplicationStage)}>
          Return to previous
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(holdApplicationStage)}>
          Put on hold
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(rejectApplicationStage)}>
          <X className="size-3.5" />
          Reject
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => run(withdrawApplicationStage)}>
          Mark withdrawn
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setShowComments((value) => !value)}>
          {showComments ? "Hide notes" : "Add notes"}
        </Button>
      </div>
      {showComments ? (
        <Textarea placeholder="Notes for this decision (optional)" value={comments} onChange={(event) => setComments(event.target.value)} />
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

export function PipelineSection({
  applicationId,
  actingEmployeeId,
  instances,
  isTerminal,
}: {
  applicationId: string
  actingEmployeeId: string
  instances: ApplicationStageInstance[]
  isTerminal: boolean
}) {
  const sorted = [...instances].sort((a, b) => a.sequence - b.sequence)
  const currentIndex = sorted.findIndex((instance) => instance.status === "PENDING" || instance.status === "IN_PROGRESS" || instance.status === "ON_HOLD")

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">No interview pipeline assigned to this application.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-2">
        {sorted.map((instance, index) => {
          const isCurrent = index === currentIndex
          return (
            <li key={instance.id} className={`rounded-lg border p-3 text-sm ${isCurrent ? "border-primary/40 bg-primary/5" : "border-border"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{index + 1}.</span>
                  <span className="font-medium text-foreground">{instance.stage.name}</span>
                  {instance.score !== null ? <Badge variant="outline">Score {instance.score.toFixed(0)}%</Badge> : null}
                </span>
                <Badge variant={statusBadgeVariant(instance.status)}>{APPLICATION_STAGE_STATUS_LABELS[instance.status]}</Badge>
              </div>
              {instance.comments ? <p className="mt-1 text-xs text-muted-foreground">{instance.comments}</p> : null}
              {isCurrent && instance.stage.isScored ? <ScoringForm instance={instance} actingEmployeeId={actingEmployeeId} /> : null}
            </li>
          )
        })}
      </ol>

      {!isTerminal ? <DecisionControls applicationId={applicationId} actingEmployeeId={actingEmployeeId} /> : null}
    </div>
  )
}
