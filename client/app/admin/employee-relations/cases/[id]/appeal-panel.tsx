"use client"

import { useActionState, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { decideAppeal, submitAppeal, type ErActionState } from "@/lib/api/employee-relations-actions"
import type { AppealOutcome } from "@/lib/api/employee-relations"

export function SubmitAppealForm({ caseId, actingEmployeeId }: { caseId: string; actingEmployeeId: string }) {
  const [state, formAction, pending] = useActionState<ErActionState | undefined, FormData>(submitAppeal.bind(null, caseId), undefined)

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <input type="hidden" name="actingEmployeeId" value={actingEmployeeId} />
      <p className="text-sm font-medium text-foreground">Appeal this decision</p>
      <Textarea name="appealReason" rows={3} placeholder="Why should this decision be reconsidered?" required />
      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Submitting…" : "Submit appeal"}
        </Button>
      </div>
    </form>
  )
}

export function DecideAppealForm({ caseId, appealId, actingEmployeeId }: { caseId: string; appealId: string; actingEmployeeId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<AppealOutcome>("UPHELD")
  const [comments, setComments] = useState("")

  function decide() {
    setError(null)
    startTransition(async () => {
      const result = await decideAppeal(caseId, appealId, actingEmployeeId, outcome, comments.trim())
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
      <p className="text-sm font-medium text-foreground">Decide this appeal</p>
      <Select value={outcome} onChange={(event) => setOutcome(event.target.value as AppealOutcome)}>
        <option value="UPHELD">Upheld — original decision stands</option>
        <option value="OVERTURNED">Overturned — original decision reversed</option>
        <option value="MODIFIED">Modified — decision adjusted</option>
      </Select>
      <Textarea placeholder="Decision comments" value={comments} onChange={(event) => setComments(event.target.value)} required />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="button" size="sm" disabled={pending || comments.trim().length === 0} onClick={decide}>
          {pending ? "Saving…" : "Record decision"}
        </Button>
      </div>
    </div>
  )
}
