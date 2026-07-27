"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { finalizeReview } from "@/lib/api/performance-actions"

export function FinalizeForm({ reviewId, actingEmployeeId }: { reviewId: string; actingEmployeeId: string }) {
  const router = useRouter()
  const [comments, setComments] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleFinalize() {
    setError(null)
    startTransition(async () => {
      const result = await finalizeReview(reviewId, actingEmployeeId, comments || undefined)
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
        placeholder="Optional HR comments…"
        value={comments}
        onChange={(event) => setComments(event.target.value)}
      />
      <div className="flex justify-end">
        <Button type="button" onClick={handleFinalize} disabled={pending}>
          {pending ? "Finalizing…" : "Finalize review"}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
