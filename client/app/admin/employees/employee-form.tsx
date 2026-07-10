"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import type { Band } from "@/lib/api/bands"
import type { Position } from "@/lib/api/positions"

import type { ActionState } from "./actions"

interface EmployeeFormProps {
  positions: Position[]
  bands: Band[]
  action: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>
}

export function EmployeeForm({ positions, bands, action }: EmployeeFormProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    action,
    undefined
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="employeeNumber">Employee number</Label>
          <Input id="employeeNumber" name="employeeNumber" placeholder="EMP-0006" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hireDate">Hire date</Label>
          <Input id="hireDate" name="hireDate" type="date" required />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" required />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="positionId">Position</Label>
          <Select id="positionId" name="positionId" defaultValue="" required>
            <option value="" disabled>
              Select a position…
            </option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.title}
                {position.department
                  ? ` (${position.unit?.name ?? position.department.name})`
                  : ""}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bandId">Band</Label>
          <Select id="bandId" name="bandId" defaultValue="" required>
            <option value="" disabled>
              Select a band…
            </option>
            {bands.map((band) => (
              <option key={band.id} value={band.id}>
                {band.name}
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
          {pending ? "Creating…" : "Create employee"}
        </Button>
      </div>
    </form>
  )
}
