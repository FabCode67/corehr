"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ReviewActions({
  actingEmployeeId,
  onReview,
}: {
  actingEmployeeId: string
  onReview: (decision: "VERIFIED" | "REJECTED", actingEmployeeId: string, comment: string | undefined) => Promise<void>
}) {
  const [comment, setComment] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function decide(decision: "VERIFIED" | "REJECTED") {
    setError(null)
    startTransition(async () => {
      try {
        await onReview(decision, actingEmployeeId, comment || undefined)
      } catch {
        setError("Failed to submit this decision.")
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} className="sm:w-56" />
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => decide("VERIFIED")}>
          Verify
        </Button>
        <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => decide("REJECTED")}>
          Reject
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
