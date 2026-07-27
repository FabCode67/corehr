"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ErActionState } from "@/lib/api/employee-relations-actions"
import type { SanctionType } from "@/lib/api/employee-relations"

interface SanctionTypeFormProps {
  sanctionType?: SanctionType
  action: (prevState: ErActionState | undefined, formData: FormData) => Promise<ErActionState>
  submitLabel: string
}

export function SanctionTypeForm({ sanctionType, action, submitLabel }: SanctionTypeFormProps) {
  const [state, formAction, pending] = useActionState<ErActionState | undefined, FormData>(action, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={sanctionType?.name} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Input id="description" name="description" defaultValue={sanctionType?.description ?? ""} />
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
