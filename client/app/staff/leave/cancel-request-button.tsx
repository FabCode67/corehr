"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { cancelLeaveRequest } from "@/lib/api/leave-actions"

export function CancelRequestButton({ requestId }: { requestId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleCancel() {
    if (!window.confirm("Cancel this leave request?")) return
    setError(null)
    startTransition(async () => {
      const result = await cancelLeaveRequest(requestId)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="destructive" size="xs" onClick={handleCancel} disabled={pending}>
        {pending ? "Cancelling…" : "Cancel"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
