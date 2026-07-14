"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { decideApproval } from "@/lib/api/leave-actions"

export function DecideRequestForm({
  requestId,
  actingEmployeeId,
}: {
  requestId: string
  actingEmployeeId: string | null
}) {
  const [comment, setComment] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDecide(decision: "APPROVED" | "REJECTED") {
    if (decision === "REJECTED" && !comment.trim()) {
      setError("A comment is required when rejecting a request.")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await decideApproval(requestId, decision, actingEmployeeId ?? undefined, comment || undefined)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-2 sm:w-64">
      <Input
        placeholder="Comment (required to reject)"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        className="h-8 text-xs"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          size="xs"
          variant="default"
          onClick={() => handleDecide("APPROVED")}
          disabled={pending}
        >
          Approve
        </Button>
        <Button
          type="button"
          size="xs"
          variant="destructive"
          onClick={() => handleDecide("REJECTED")}
          disabled={pending}
        >
          Reject
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
