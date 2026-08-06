"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Employee } from "@/lib/api/employees"
import { scheduleDisciplinaryMeeting, type ErActionState } from "@/lib/api/employee-relations-actions"

/** Plain FormData-friendly checkboxes (repeated `name`, read back with
 *  formData.getAll()) — same pattern as CheckboxGroup in
 *  app/admin/onboarding-documents/document-types/document-type-form.tsx,
 *  kept local here since this is the only place inviting meeting attendees
 *  happens. */
function InviteesField({ employees }: { employees: Employee[] }) {
  return employees.length === 0 ? (
    <p className="text-xs text-muted-foreground">No other active employees to invite.</p>
  ) : (
    <div className="grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
      {employees.map((employee) => (
        <label key={employee.employeeNumber} className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="inviteeIds" value={employee.employeeNumber} className="size-3.5 rounded border-input" />
          {employee.firstName} {employee.lastName}
        </label>
      ))}
    </div>
  )
}

export function MeetingForm({ caseId, createdById, employees }: { caseId: string; createdById: string; employees: Employee[] }) {
  const [state, formAction, pending] = useActionState<ErActionState | undefined, FormData>(scheduleDisciplinaryMeeting.bind(null, caseId), undefined)

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <input type="hidden" name="createdById" value={createdById} />
      <p className="text-sm font-medium text-foreground">Schedule a disciplinary meeting</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="subject">Subject (optional)</Label>
        <Input id="subject" name="subject" placeholder="e.g. Disciplinary hearing" />
      </div>
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
        <Label htmlFor="notes">Notes / description (optional)</Label>
        <Input id="notes" name="notes" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Invite other staff (optional)</Label>
        <p className="text-xs text-muted-foreground">
          Each invitee gets an email with the subject, date, time, location, and notes above — not the case itself.
        </p>
        <InviteesField employees={employees} />
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
