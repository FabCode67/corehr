"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import type { NotificationPreference } from "@/lib/api/email"
import { updateNotificationPreferences, type PreferencesFormState } from "@/lib/api/email-actions"

const initialState: PreferencesFormState = {}

const CATEGORY_FIELDS: { name: keyof NotificationPreference; label: string; description: string }[] = [
  { name: "leaveEmails", label: "Leave", description: "Submission, approval, rejection, cancellation, low balance, carry-forward expiring." },
  { name: "performanceEmails", label: "Performance", description: "Self-appraisal open, deadline reminders, overdue notices." },
  { name: "learningEmails", label: "Learning & Development", description: "Course assignments and deadline reminders (mandatory compliance training always sends)." },
  { name: "recruitmentEmails", label: "Recruitment", description: "Only relevant if you also act as a recruiter, hiring manager, or panelist." },
  { name: "exitEmails", label: "Exit Management", description: "Exit forms, clearance checklist, workflow updates." },
  { name: "approvalEmails", label: "Approvals", description: "Form signature and approval requests, completions, and rejections." },
]

export function PreferencesForm({ employeeId, preference }: { employeeId: string; preference: NotificationPreference }) {
  const updateWithId = updateNotificationPreferences.bind(null, employeeId)
  const [state, formAction, pending] = useActionState(updateWithId, initialState)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Email &amp; in-app notifications</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <input
              id="emailEnabled"
              name="emailEnabled"
              type="checkbox"
              defaultChecked={preference.emailEnabled}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="emailEnabled" className="font-normal">
              Send me email notifications (master switch)
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="inAppEnabled"
              name="inAppEnabled"
              type="checkbox"
              defaultChecked={preference.inAppEnabled}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="inAppEnabled" className="font-normal">
              Send me in-app notifications
            </Label>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground uppercase">By category (email)</p>
            <div className="flex flex-col gap-3">
              {CATEGORY_FIELDS.map((field) => (
                <div key={field.name} className="flex items-start gap-2">
                  <input
                    id={field.name}
                    name={field.name}
                    type="checkbox"
                    defaultChecked={Boolean(preference[field.name])}
                    className="mt-1 size-4 rounded border-input"
                  />
                  <Label htmlFor={field.name} className="flex flex-col gap-0.5 font-normal">
                    <span className="text-foreground">{field.label}</span>
                    <span className="text-xs text-muted-foreground">{field.description}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {state?.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          {state?.success ? <p className="text-sm text-emerald-600">Preferences saved.</p> : null}
        </CardContent>

        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save preferences"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
