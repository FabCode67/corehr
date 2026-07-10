"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Band } from "@/lib/api/bands"

import type { ActionState } from "../actions"

interface BandFormProps {
  bands: Band[]
  currentBandId: string
  action: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>
}

export function BandForm({ bands, currentBandId, action }: BandFormProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    action,
    undefined
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="band-bandId">New band</Label>
        <Select id="band-bandId" name="bandId" defaultValue={currentBandId} required>
          {bands.map((band) => (
            <option key={band.id} value={band.id}>
              {band.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="band-effectiveFrom">Effective from</Label>
        <Input id="band-effectiveFrom" name="effectiveFrom" type="date" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="band-changeReason">Reason (optional)</Label>
        <Textarea id="band-changeReason" name="changeReason" rows={2} />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Updating…" : "Change band"}
        </Button>
      </div>
    </form>
  )
}
