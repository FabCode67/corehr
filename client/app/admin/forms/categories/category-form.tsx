"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { FormsActionState } from "@/lib/api/forms-actions"
import type { FormCategory } from "@/lib/api/forms"

interface CategoryFormProps {
  category?: FormCategory
  action: (prevState: FormsActionState | undefined, formData: FormData) => Promise<FormsActionState>
  submitLabel: string
}

export function CategoryForm({ category, action, submitLabel }: CategoryFormProps) {
  const [state, formAction, pending] = useActionState<FormsActionState | undefined, FormData>(action, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={category?.name} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Input id="description" name="description" defaultValue={category?.description ?? ""} />
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
