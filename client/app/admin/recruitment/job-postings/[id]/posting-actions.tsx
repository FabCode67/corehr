"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { closeJobPosting, publishJobPosting } from "@/lib/api/recruitment-actions"
import type { JobPostingStatus } from "@/lib/api/recruitment"

export function PostingActions({ postingId, actingEmployeeId, status }: { postingId: string; actingEmployeeId: string; status: JobPostingStatus }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  if (status !== "DRAFT" && status !== "PUBLISHED") return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {status === "DRAFT" ? (
          <Button type="button" size="sm" disabled={pending} onClick={() => run(() => publishJobPosting(postingId, actingEmployeeId))}>
            {pending ? "Publishing…" : "Publish"}
          </Button>
        ) : null}
        {status === "PUBLISHED" ? (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => closeJobPosting(postingId, actingEmployeeId))}>
            {pending ? "Closing…" : "Close posting"}
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
