"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { submitGrievance, type ErActionState } from "@/lib/api/employee-relations-actions"
import { formatErEnum, type GrievanceCategory } from "@/lib/api/employee-relations"

const CATEGORIES: GrievanceCategory[] = [
  "WORKPLACE_CONFLICT",
  "HARASSMENT",
  "DISCRIMINATION",
  "COMPENSATION",
  "WORKING_CONDITIONS",
  "MANAGEMENT_CONDUCT",
  "POLICY_DISPUTE",
  "OTHER",
]

export function GrievanceForm({ employeeId }: { employeeId: string }) {
  const [state, formAction, pending] = useActionState<ErActionState | undefined, FormData>(submitGrievance, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="employeeId" value={employeeId} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Category</Label>
        <Select id="category" name="category" required defaultValue="">
          <option value="" disabled>
            Select a category…
          </option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {formatErEnum(category)}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={5} required />
      </div>

      <p className="text-xs text-muted-foreground">Only authorized HR personnel and you can see this grievance.</p>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit grievance"}
        </Button>
      </div>
    </form>
  )
}
