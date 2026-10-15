"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { approveRequisition, rejectRequisition } from "@/lib/api/recruitment-actions"

/** Final MD decision on a requisition: approve, or reject with a reason. */
export function MdApprovalButtons({ requisitionId, actingEmployeeId, redirectTo }: { requisitionId: string; actingEmployeeId: string; redirectTo?: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [active, setActive] = useState<"approve" | "reject" | null>(null)
  const [showReject, setShowReject] = useState(false)
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string | null>(null)

  function run(kind: "approve" | "reject", action: () => Promise<{ error?: string }>) {
    setError(null)
    setActive(kind)
    startTransition(async () => {
      const result = await action()
      setActive(null)
      if (result?.error) return setError(result.error)
      if (redirectTo) router.push(redirectTo)
      else router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => run("approve", () => approveRequisition(requisitionId, actingEmployeeId))}>
          {active === "approve" ? "Approving…" : "Approve"}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setShowReject((v) => !v)}>
          Reject
        </Button>
      </div>
      {showReject ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <Textarea placeholder="Reason for rejection…" value={comment} onChange={(e) => setComment(e.target.value)} />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pending || comment.trim().length === 0}
              onClick={() => run("reject", () => rejectRequisition(requisitionId, actingEmployeeId, comment.trim()))}
            >
              {active === "reject" ? "Rejecting…" : "Confirm rejection"}
            </Button>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
