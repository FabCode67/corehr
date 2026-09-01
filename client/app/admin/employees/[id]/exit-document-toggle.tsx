"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { completeExitDocument } from "@/lib/api/exit-documents-actions"

export function ExitDocumentToggle({
  assignmentId,
  employeeId,
  actingEmployeeId,
  isCompleted,
}: {
  assignmentId: string
  employeeId: string
  actingEmployeeId: string
  isCompleted: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggle() {
    setError(null)
    startTransition(async () => {
      const result = await completeExitDocument(assignmentId, actingEmployeeId, !isCompleted, employeeId)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant={isCompleted ? "outline" : "default"} disabled={pending} onClick={toggle}>
        {pending ? "Saving…" : isCompleted ? "Mark incomplete" : "Mark complete"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
