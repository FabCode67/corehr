"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { LearningActionState } from "@/lib/api/learning-actions"
import type { Institution } from "@/lib/api/learning"

interface InstitutionFormProps {
  institution?: Institution
  action: (prevState: LearningActionState | undefined, formData: FormData) => Promise<LearningActionState>
  submitLabel: string
}

export function InstitutionForm({ institution, action, submitLabel }: InstitutionFormProps) {
  const [state, formAction, pending] = useActionState<LearningActionState | undefined, FormData>(
    action,
    undefined
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={institution?.name} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contactEmail">Contact email (optional)</Label>
        <Input id="contactEmail" name="contactEmail" type="email" defaultValue={institution?.contactEmail ?? ""} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contactPhone">Contact phone (optional)</Label>
        <Input id="contactPhone" name="contactPhone" defaultValue={institution?.contactPhone ?? ""} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="website">Website (optional)</Label>
        <Input id="website" name="website" defaultValue={institution?.website ?? ""} />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  )
}
