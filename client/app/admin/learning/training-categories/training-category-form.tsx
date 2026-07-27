"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { LearningActionState } from "@/lib/api/learning-actions"
import type { TrainingCategory } from "@/lib/api/learning"

interface TrainingCategoryFormProps {
  category?: TrainingCategory
  action: (prevState: LearningActionState | undefined, formData: FormData) => Promise<LearningActionState>
  submitLabel: string
}

export function TrainingCategoryForm({ category, action, submitLabel }: TrainingCategoryFormProps) {
  const [state, formAction, pending] = useActionState<LearningActionState | undefined, FormData>(
    action,
    undefined
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={category?.name} required />
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="isMandatory"
          defaultChecked={category?.isMandatory ?? false}
          className="size-4 rounded border-input"
        />
        Mandatory (regulatory or internal compliance training)
      </label>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" defaultValue={category?.description ?? ""} />
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
