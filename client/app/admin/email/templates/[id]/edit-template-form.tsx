"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateEmailTemplate, type TemplateFormState } from "@/lib/api/email-actions"
import type { EmailTemplate } from "@/lib/api/email"

const initialState: TemplateFormState = {}

export function EditTemplateForm({ template }: { template: EmailTemplate }) {
  const updateWithId = updateEmailTemplate.bind(null, template.id)
  const [state, formAction, pending] = useActionState(updateWithId, initialState)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Edit template</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" defaultValue={template.subject} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bodyHtml">Body (HTML)</Label>
            <Textarea id="bodyHtml" name="bodyHtml" defaultValue={template.bodyHtml} rows={16} className="font-mono text-xs" required />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              defaultChecked={template.isActive}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="isActive" className="font-normal">
              Active — inactive templates are skipped by EmailService.enqueue() (no email sent, silently)
            </Label>
          </div>

          {state?.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          {state?.success ? <p className="text-sm text-emerald-600">Saved.</p> : null}
        </CardContent>

        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
