"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Branch } from "@/lib/api/branches"

import type { ActionState } from "./actions"

interface BranchFormProps {
  branch?: Branch
  action: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>
  submitLabel: string
}

export function BranchForm({ branch, action, submitLabel }: BranchFormProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    action,
    undefined
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={branch?.name} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">Code (optional)</Label>
        <Input id="code" name="code" defaultValue={branch?.code ?? ""} />
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="isHeadquarters"
          defaultChecked={branch?.isHeadquarters ?? false}
          className="size-4 rounded border-input"
        />
        This is the headquarters
      </label>

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
