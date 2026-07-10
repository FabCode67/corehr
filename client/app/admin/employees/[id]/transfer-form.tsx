"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Position } from "@/lib/api/positions"

import type { ActionState } from "../actions"

const CHANGE_TYPES = [
  { value: "PROMOTION", label: "Promotion" },
  { value: "DEMOTION", label: "Demotion" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "REPORTING_LINE_CHANGE", label: "Reporting line change" },
  { value: "RESTRUCTURE", label: "Restructure" },
]

interface TransferFormProps {
  positions: Position[]
  currentPositionId: string
  action: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>
}

export function TransferForm({ positions, currentPositionId, action }: TransferFormProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    action,
    undefined
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transfer-positionId">New position</Label>
          <Select
            id="transfer-positionId"
            name="positionId"
            defaultValue={currentPositionId}
            required
          >
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
          <Label htmlFor="transfer-changeType">Change type</Label>
          <Select id="transfer-changeType" name="changeType" defaultValue="" required>
            <option value="" disabled>
              Select a change type…
            </option>
            {CHANGE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="transfer-effectiveFrom">Effective from</Label>
        <Input id="transfer-effectiveFrom" name="effectiveFrom" type="date" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="transfer-changeReason">Reason (optional)</Label>
        <Textarea id="transfer-changeReason" name="changeReason" rows={2} />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Transferring…" : "Transfer employee"}
        </Button>
      </div>
    </form>
  )
}
