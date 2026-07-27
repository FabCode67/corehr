"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { scheduleDisciplinaryMeeting, type ErActionState } from "@/lib/api/employee-relations-actions"

export function MeetingForm({ caseId, createdById }: { caseId: string; createdById: string }) {
  const [state, formAction, pending] = useActionState<ErActionState | undefined, FormData>(scheduleDisciplinaryMeeting.bind(null, caseId), undefined)

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <input type="hidden" name="createdById" value={createdById} />
      <p className="text-sm font-medium text-foreground">Schedule a disciplinary meeting</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="scheduledAt">Date &amp; time</Label>
          <Input id="scheduledAt" name="scheduledAt" type="datetime-local" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="location">Location (optional)</Label>
          <Input id="location" name="location" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" name="notes" />
      </div>
      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Scheduling…" : "Schedule meeting"}
        </Button>
      </div>
    </form>
  )
}
