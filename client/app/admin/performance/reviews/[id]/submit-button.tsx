"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { submitReview } from "@/lib/api/performance-actions"

export function SubmitButton({ reviewId, actingEmployeeId }: { reviewId: string; actingEmployeeId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await submitReview(reviewId, actingEmployeeId)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button type="button" onClick={handleSubmit} disabled={pending}>
        {pending ? "Submitting…" : "Submit review"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
