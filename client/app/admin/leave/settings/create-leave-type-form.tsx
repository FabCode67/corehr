"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { createLeaveType, type LeaveActionState } from "@/lib/api/leave-actions"
import { LEAVE_CATEGORIES } from "@/lib/api/leave"
import { formatEnumLabel } from "@/lib/api/employees"

export function CreateLeaveTypeForm() {
  const [state, formAction, pending] = useActionState<LeaveActionState | undefined, FormData>(
    createLeaveType,
    undefined
  )

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="new-name" className="text-xs text-muted-foreground">
          New leave type name
        </Label>
        <Input id="new-name" name="name" placeholder="e.g. Study Leave" className="w-52" required />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="new-code" className="text-xs text-muted-foreground">
          Code
        </Label>
        <Input id="new-code" name="code" className="w-24" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="new-category" className="text-xs text-muted-foreground">
          Category
        </Label>
        <Select id="new-category" name="category" defaultValue="OTHER" className="w-40">
          {LEAVE_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {formatEnumLabel(value)}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add leave type"}
      </Button>
      {state?.error ? <p className="w-full text-xs text-destructive">{state.error}</p> : null}
    </form>
  )
}
