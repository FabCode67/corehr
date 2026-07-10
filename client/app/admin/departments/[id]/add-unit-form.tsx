"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ActionState } from "../actions"

interface AddUnitFormProps {
  action: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>
}

export function AddUnitForm({ action }: AddUnitFormProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    action,
    undefined
  )

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="unit-name" className="text-xs text-muted-foreground">
          New unit name
        </label>
        <Input id="unit-name" name="name" placeholder="e.g. IT Channels" className="w-56" required />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="unit-code" className="text-xs text-muted-foreground">
          Code (optional)
        </label>
        <Input id="unit-code" name="code" className="w-28" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add unit"}
      </Button>
      {state?.error ? <p className="w-full text-xs text-destructive">{state.error}</p> : null}
    </form>
  )
}
