"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createReviewPeriod, type PerformanceActionState } from "@/lib/api/performance-actions"

export function NewPeriodForm() {
  const [state, formAction, pending] = useActionState<PerformanceActionState | undefined, FormData>(
    createReviewPeriod,
    undefined
  )
  const currentYear = new Date().getFullYear()

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder={`FY${currentYear + 1}`} required className="w-40" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="year">Year</Label>
        <Input id="year" name="year" type="number" defaultValue={currentYear + 1} required className="w-28" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create period"}
      </Button>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </form>
  )
}
