"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { reviewExitClearanceForm } from "@/lib/api/exit-clearance-actions"

/** Approve/return actions for whoever currently holds a clearance form's
 *  responsible position — see ExitClearanceService.review(). Duplicated
 *  (rather than imported) from the admin portal's equivalent override
 *  component, matching this codebase's convention of duplicating small
 *  cross-module UI pieces instead of reaching across the admin/staff portal
 *  boundary. */
export function ReviewActions({ assignmentId, reviewerId }: { assignmentId: string; reviewerId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [returning, setReturning] = useState(false)
  const [comment, setComment] = useState("")

  function approve() {
    setError(null)
    startTransition(async () => {
      const result = await reviewExitClearanceForm(assignmentId, reviewerId, "APPROVE")
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function submitReturn() {
    if (!comment.trim()) {
      setError("A comment is required when returning a form.")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await reviewExitClearanceForm(assignmentId, reviewerId, "RETURN", comment.trim())
      if (result?.error) {
        setError(result.error)
        return
      }
      setReturning(false)
      setComment("")
      router.refresh()
    })
  }

  if (returning) {
    return (
      <div className="flex w-full flex-col gap-2 sm:w-64">
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What needs to be fixed?" rows={2} className="text-sm" />
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setReturning(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={submitReturn}>
            {pending ? "Sending…" : "Submit return"}
          </Button>
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setReturning(true)}>
          Return
        </Button>
        <Button type="button" size="sm" disabled={pending} onClick={approve}>
          {pending ? "Saving…" : "Approve"}
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
