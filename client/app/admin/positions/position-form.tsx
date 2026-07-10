"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import type { Department } from "@/lib/api/departments"
import type { Position, PositionLevel } from "@/lib/api/positions"

import type { ActionState } from "./actions"

interface PositionFormProps {
  departments: Department[]
  levels: PositionLevel[]
  positions: Position[]
  position?: Position
  action: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>
  submitLabel: string
}

export function PositionForm({
  departments,
  levels,
  positions,
  position,
  action,
  submitLabel,
}: PositionFormProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    action,
    undefined
  )

  // A position can't report to itself (and PositionsService rejects any
  // change that would create a cycle further down the chain too).
  const reportsToOptions = positions.filter((candidate) => candidate.id !== position?.id)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={position?.title} required />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="departmentId">Department</Label>
          <Select
            id="departmentId"
            name="departmentId"
            defaultValue={position?.departmentId ?? ""}
            required
          >
            <option value="" disabled>
              Select a department…
            </option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unitId">Unit (optional)</Label>
          <Select id="unitId" name="unitId" defaultValue={position?.unitId ?? ""}>
            <option value="">No unit — attaches directly to department</option>
            {departments.map((department) =>
              department.units && department.units.length > 0 ? (
                <optgroup key={department.id} label={department.name}>
                  {department.units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </optgroup>
              ) : null
            )}
          </Select>
          <p className="text-xs text-muted-foreground">
            Must belong to the department selected above — the API validates this.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="levelId">Level</Label>
          <Select id="levelId" name="levelId" defaultValue={position?.levelId ?? ""} required>
            <option value="" disabled>
              Select a level…
            </option>
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.code ? `${level.code} — ${level.name}` : level.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reportsToPositionId">Reports to (optional)</Label>
          <Select
            id="reportsToPositionId"
            name="reportsToPositionId"
            defaultValue={position?.reportsToPositionId ?? ""}
          >
            <option value="">No one — top of the org tree</option>
            {reportsToOptions.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.title}
                {candidate.department
                  ? ` (${candidate.unit?.name ?? candidate.department.name})`
                  : ""}
              </option>
            ))}
          </Select>
        </div>
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
