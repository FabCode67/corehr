"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { completeExitClearanceForm } from "@/lib/api/exit-clearance-actions"

export function CompleteFormButton({ assignmentId, employeeId }: { assignmentId: string; employeeId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function complete() {
    setError(null)
    startTransition(async () => {
      const result = await completeExitClearanceForm(assignmentId, employeeId)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" disabled={pending} onClick={complete}>
        {pending ? "Saving…" : "Mark my part done"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
