"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  acceptAssignment,
  closeAssignment,
  markAssignmentCompleted,
  startAssignment,
} from "@/lib/api/learning-actions"
import type { CourseAssignmentStatus } from "@/lib/api/learning"

type Action = "accept" | "start" | "complete" | "close"

const ACTION_LABELS: Record<Action, { label: string; pendingLabel: string }> = {
  accept: { label: "Confirm enrollment", pendingLabel: "Confirming…" },
  start: { label: "Mark as started", pendingLabel: "Saving…" },
  complete: { label: "Confirm I've completed this course", pendingLabel: "Saving…" },
  close: { label: "Close assignment", pendingLabel: "Closing…" },
}

export function LifecycleActions({
  assignmentId,
  actingEmployeeId,
  status,
  isAssignee,
  isAdmin,
}: {
  assignmentId: string
  actingEmployeeId: string
  status: CourseAssignmentStatus
  isAssignee: boolean
  isAdmin: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const actions: Action[] = []
  if (isAssignee) {
    if (status === "ASSIGNED") actions.push("accept")
    if (status === "ASSIGNED" || status === "ACCEPTED") actions.push("start")
    if (status === "ASSIGNED" || status === "ACCEPTED" || status === "IN_PROGRESS") actions.push("complete")
  }
  if (isAdmin && status === "VERIFIED") actions.push("close")

  if (actions.length === 0) return null

  function run(action: Action) {
    setError(null)
    startTransition(async () => {
      const fn = { accept: acceptAssignment, start: startAssignment, complete: markAssignmentCompleted, close: closeAssignment }[
        action
      ]
      const result = await fn(assignmentId, actingEmployeeId)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button key={action} type="button" size="sm" disabled={pending} onClick={() => run(action)}>
            {pending ? ACTION_LABELS[action].pendingLabel : ACTION_LABELS[action].label}
          </Button>
        ))}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
