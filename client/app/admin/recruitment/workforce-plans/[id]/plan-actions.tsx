"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { approveWorkforcePlan, rejectWorkforcePlan, submitWorkforcePlan } from "@/lib/api/recruitment-actions"
import type { WorkforcePlanStatus } from "@/lib/api/recruitment"

export function PlanActions({
  planId,
  actingEmployeeId,
  status,
  isAdmin,
}: {
  planId: string
  actingEmployeeId: string
  status: WorkforcePlanStatus
  isAdmin: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showReject, setShowReject] = useState(false)
  const [comment, setComment] = useState("")

  function run(action: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result?.error) {
        setError(result.error)
        return
      }
      setShowReject(false)
      router.refresh()
    })
  }

  const canSubmit = status === "DRAFT"
  const canDecide = isAdmin && status === "PENDING_APPROVAL"

  if (!canSubmit && !canDecide) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {canSubmit ? (
          <Button type="button" size="sm" disabled={pending} onClick={() => run(() => submitWorkforcePlan(planId, actingEmployeeId))}>
            {pending ? "Submitting…" : "Submit for approval"}
          </Button>
        ) : null}
        {canDecide ? (
          <>
            <Button type="button" size="sm" disabled={pending} onClick={() => run(() => approveWorkforcePlan(planId, actingEmployeeId))}>
              {pending ? "Approving…" : "Approve"}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setShowReject((value) => !value)}>
              Reject
            </Button>
          </>
        ) : null}
      </div>

      {showReject ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <Textarea
            placeholder="Reason for rejection…"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pending || comment.trim().length === 0}
              onClick={() => run(() => rejectWorkforcePlan(planId, actingEmployeeId, comment.trim()))}
            >
              {pending ? "Rejecting…" : "Confirm rejection"}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
