"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { advanceApplicationStage, holdApplicationStage, rejectApplicationStage } from "@/lib/api/recruitment-actions"

/** The quickest way to progress a candidate: move to the next hiring step, hold, or reject. */
export function AdvanceBar({
  applicationId,
  actingEmployeeId,
  currentStep,
  nextStep,
  goToHireAfter,
  atHireStep,
}: {
  applicationId: string
  actingEmployeeId: string
  currentStep: string | null
  nextStep: string | null
  /** Moving on lands on the onboarding step or finishes the pipeline → open the hire form. */
  goToHireAfter: boolean
  /** Already on the onboarding/last step. */
  atHireStep: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [active, setActive] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function run(key: string, action: () => Promise<{ error?: string }>, then?: () => void) {
    setError(null)
    setActive(key)
    startTransition(async () => {
      const result = await action()
      setActive(null)
      if (result?.error) return setError(result.error)
      if (then) return then()
      router.refresh()
    })
  }

  function reject() {
    const reason = window.prompt("Reject this candidate? Optional reason:")
    if (reason === null) return
    run("reject", () => rejectApplicationStage(applicationId, actingEmployeeId, reason || undefined))
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
      <div className="text-sm">
        <p className="font-medium text-foreground">{currentStep ? `Current step: ${currentStep}` : "No active step"}</p>
        <p className="text-xs text-muted-foreground">{nextStep ? `Next: ${nextStep}` : currentStep ? "This is the final step — moving on selects the candidate." : ""}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {atHireStep ? (
          <Button type="button" size="sm" onClick={() => router.push(`/admin/recruitment/applications/${applicationId}/hire`)}>
            Hire &amp; create employee
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={pending || !currentStep}
            onClick={() =>
              run(
                "advance",
                () => advanceApplicationStage(applicationId, actingEmployeeId),
                goToHireAfter ? () => router.push(`/admin/recruitment/applications/${applicationId}/hire`) : undefined
              )
            }
          >
            {active === "advance" ? "Moving…" : goToHireAfter ? (nextStep ? `Move to ${nextStep} & hire` : "Select & hire") : "Move to next step"}
          </Button>
        )}
        <Button type="button" size="sm" variant="outline" disabled={pending || !currentStep || atHireStep} onClick={() => run("hold", () => holdApplicationStage(applicationId, actingEmployeeId))}>
          {active === "hold" ? "Holding…" : "Hold"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={reject}>
          Reject
        </Button>
      </div>
      {error ? <p className="w-full text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
