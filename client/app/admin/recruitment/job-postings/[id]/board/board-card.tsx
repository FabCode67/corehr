"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { advanceApplicationStage, holdApplicationStage, rejectApplicationStage } from "@/lib/api/recruitment-actions"

/** One candidate on the hiring board: shortlist (advance to next step), hold, or reject. */
export function BoardCard({
  applicationId,
  actingEmployeeId,
  name,
  score,
  stepName,
  isLastStep,
  hireAfter,
  onHold,
}: {
  applicationId: string
  actingEmployeeId: string
  name: string
  score: number | null
  stepName: string
  isLastStep: boolean
  /** Moving on ends the pipeline or lands on onboarding → open the hire form. */
  hireAfter: boolean
  onHold: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<{ error?: string }>, then?: () => void) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result?.error) return setError(result.error)
      if (then) return then()
      router.refresh()
    })
  }

  function reject() {
    const reason = window.prompt(`Reject ${name}? Optional reason:`)
    if (reason === null) return
    run(() => rejectApplicationStage(applicationId, actingEmployeeId, reason || undefined))
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-2.5 text-sm">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/admin/recruitment/applications/${applicationId}`} className="font-medium text-foreground hover:underline">
          {name}
        </Link>
        {score !== null ? <span className="text-xs text-muted-foreground">{score.toFixed(1)}</span> : null}
      </div>
      {onHold ? <span className="text-xs text-amber-600">On hold</span> : null}
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" size="sm" disabled={pending} onClick={() =>
            run(
              () => advanceApplicationStage(applicationId, actingEmployeeId),
              hireAfter || isLastStep ? () => router.push(`/admin/recruitment/applications/${applicationId}/hire`) : undefined
            )
          }
        >
          {hireAfter || isLastStep ? "Select & hire" : "Shortlist"}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => holdApplicationStage(applicationId, actingEmployeeId))}>
          Hold
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={reject}>
          Reject
        </Button>
      </div>
      <p className="sr-only">{stepName}</p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
