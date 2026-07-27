"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateRatingScaleEntry, type PerformanceActionState } from "@/lib/api/performance-actions"
import type { RatingScaleEntry } from "@/lib/api/performance"

export function RatingScaleForm({ entry }: { entry: RatingScaleEntry }) {
  const [state, formAction, pending] = useActionState<PerformanceActionState | undefined, FormData>(
    updateRatingScaleEntry.bind(null, entry.id),
    undefined
  )

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`label-${entry.id}`}>Label</Label>
        <Input id={`label-${entry.id}`} name="label" defaultValue={entry.label} required className="w-52" />
      </div>
      <div className="flex flex-1 min-w-56 flex-col gap-1.5">
        <Label htmlFor={`description-${entry.id}`}>Description</Label>
        <Input
          id={`description-${entry.id}`}
          name="description"
          defaultValue={entry.description ?? ""}
        />
      </div>
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Saving…" : "Save"}
      </Button>
      {state?.error ? <p className="w-full text-sm text-destructive">{state.error}</p> : null}
    </form>
  )
}
