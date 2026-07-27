"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { acknowledgeReview } from "@/lib/api/performance-actions"

export function AcknowledgeForm({ reviewId, actingEmployeeId }: { reviewId: string; actingEmployeeId: string }) {
  const router = useRouter()
  const [comments, setComments] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAcknowledge() {
    setError(null)
    startTransition(async () => {
      const result = await acknowledgeReview(reviewId, actingEmployeeId, comments || undefined)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        placeholder="Optional comments…"
        value={comments}
        onChange={(event) => setComments(event.target.value)}
      />
      <div className="flex justify-end">
        <Button type="button" onClick={handleAcknowledge} disabled={pending}>
          {pending ? "Acknowledging…" : "Acknowledge review"}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
