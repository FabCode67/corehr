"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { closeDisciplinaryCase, submitDisciplinaryCase } from "@/lib/api/employee-relations-actions"
import type { DisciplinaryCaseStatus } from "@/lib/api/employee-relations"

/** Draft -> active pipeline and any-open-status -> Closed. Mirrors
 *  SignaturePanel's run()/useTransition pattern from Forms Management. */
export function CaseActions({ caseId, actingEmployeeId, status }: { caseId: string; actingEmployeeId: string; status: DisciplinaryCaseStatus }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const [comments, setComments] = useState("")

  function run(action: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result?.error) {
        setError(result.error)
        return
      }
      setClosing(false)
      router.refresh()
    })
  }

  const canSubmit = status === "DRAFT"
  const canClose = status !== "CLOSED"

  if (!canSubmit && !canClose) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {canSubmit ? (
          <Button type="button" size="sm" disabled={pending} onClick={() => run(() => submitDisciplinaryCase(caseId, actingEmployeeId))}>
            {pending ? "Submitting…" : "Submit case"}
          </Button>
        ) : null}
        {canClose ? (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setClosing((value) => !value)}>
            Close case
          </Button>
        ) : null}
      </div>

      {closing ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <Textarea placeholder="Closing comments (optional)" value={comments} onChange={(event) => setComments(event.target.value)} />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => run(() => closeDisciplinaryCase(caseId, actingEmployeeId, comments.trim() || undefined))}
            >
              {pending ? "Closing…" : "Confirm close"}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
