"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Department, OrgFunction } from "@/lib/api/departments"

import type { ActionState } from "./actions"

interface DepartmentFormProps {
  functions: OrgFunction[]
  /** Every other department, for the optional Parent Department picker —
   *  callers should exclude `department` itself (obvious self-reference;
   *  the server also rejects it and any cycle regardless). */
  departments?: Department[]
  department?: Department
  action: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>
  submitLabel: string
}

export function DepartmentForm({
  functions,
  departments = [],
  department,
  action,
  submitLabel,
}: DepartmentFormProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    action,
    undefined
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="functionId">Function</Label>
        <Select id="functionId" name="functionId" defaultValue={department?.functionId ?? ""} required>
          <option value="" disabled>
            Select a function…
          </option>
          {functions.map((fn) => (
            <option key={fn.id} value={fn.id}>
              {fn.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={department?.name} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">Code (optional)</Label>
        <Input id="code" name="code" defaultValue={department?.code ?? ""} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="parentDepartmentId">Parent Department (optional)</Label>
        <Select id="parentDepartmentId" name="parentDepartmentId" defaultValue={department?.parentDepartmentId ?? ""}>
          <option value="">None</option>
          {departments.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </Select>
        <p className="text-xs text-muted-foreground">
          A genuine Department-to-Department hierarchy, separate from Function above. Org chart and dashboards still key off Function only.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" defaultValue={department?.description ?? ""} />
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
