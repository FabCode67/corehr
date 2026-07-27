"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { closeReviewCycle, openReviewCycle } from "@/lib/api/performance-actions"
import type { PerformanceCycleStatus, PerformanceReviewType } from "@/lib/api/performance"

export function CycleActions({
  periodId,
  cycle,
  status,
}: {
  periodId: string
  cycle: PerformanceReviewType
  status: PerformanceCycleStatus
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleOpen() {
    setError(null)
    startTransition(async () => {
      const result = await openReviewCycle(periodId, cycle)
      if (result?.error) setError(result.error)
    })
  }

  function handleClose() {
    setError(null)
    startTransition(async () => {
      const result = await closeReviewCycle(periodId, cycle)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        {status !== "OPEN" ? (
          <Button type="button" size="xs" disabled={pending || status === "CLOSED"} onClick={handleOpen}>
            {status === "CLOSED" ? "Closed" : pending ? "Opening…" : "Open cycle"}
          </Button>
        ) : (
          <Button type="button" size="xs" variant="destructive" disabled={pending} onClick={handleClose}>
            {pending ? "Closing…" : "Close cycle"}
          </Button>
        )}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
