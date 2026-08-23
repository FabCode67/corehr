"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button, buttonVariants } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  approveRequisition,
  closeRequisition,
  deleteRequisition,
  reopenRequisition,
  rejectRequisition,
  submitRequisition,
} from "@/lib/api/recruitment-actions"
import type { RequisitionStatus } from "@/lib/api/recruitment"

export function RequisitionActions({
  requisitionId,
  actingEmployeeId,
  status,
  isAdmin,
}: {
  requisitionId: string
  actingEmployeeId: string
  status: RequisitionStatus
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
  const canClose = status === "APPROVED"
  const canReopen = status === "CLOSED"
  const canEdit = status !== "CLOSED"
  const canDelete = status === "DRAFT"

  function handleDelete() {
    if (!window.confirm("Delete this draft requisition? This can't be undone.")) return
    run(() => deleteRequisition(requisitionId, actingEmployeeId))
  }

  if (!canSubmit && !canDecide && !canClose && !canReopen && !canEdit && !canDelete) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {canEdit ? (
          <Link href={`/admin/recruitment/requisitions/${requisitionId}/edit`} className={buttonVariants({ size: "sm", variant: "outline" })}>
            Edit details
          </Link>
        ) : null}
        {canSubmit ? (
          <Button type="button" size="sm" disabled={pending} onClick={() => run(() => submitRequisition(requisitionId, actingEmployeeId))}>
            {pending ? "Submitting…" : "Submit for approval"}
          </Button>
        ) : null}
        {canDecide ? (
          <>
            <Button type="button" size="sm" disabled={pending} onClick={() => run(() => approveRequisition(requisitionId, actingEmployeeId))}>
              {pending ? "Approving…" : "Approve"}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setShowReject((value) => !value)}>
              Reject
            </Button>
          </>
        ) : null}
        {canClose ? (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => closeRequisition(requisitionId, actingEmployeeId))}>
            {pending ? "Closing…" : "Close requisition"}
          </Button>
        ) : null}
        {canReopen ? (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => reopenRequisition(requisitionId, actingEmployeeId))}>
            {pending ? "Reopening…" : "Reopen requisition"}
          </Button>
        ) : null}
        {canDelete ? (
          <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={handleDelete}>
            {pending ? "Deleting…" : "Delete requisition"}
          </Button>
        ) : null}
      </div>

      {showReject ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <Textarea placeholder="Reason for rejection…" value={comment} onChange={(event) => setComment(event.target.value)} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pending || comment.trim().length === 0}
              onClick={() => run(() => rejectRequisition(requisitionId, actingEmployeeId, comment.trim()))}
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
