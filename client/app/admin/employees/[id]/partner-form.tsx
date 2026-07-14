"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Employee } from "@/lib/api/employees"

import type { ActionState } from "../actions"

interface PartnerFormProps {
  employee: Employee
  action: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>
}

export function PartnerForm({ employee, action }: PartnerFormProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    action,
    undefined
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="partnerName">Partner name</Label>
          <Input id="partnerName" name="partnerName" defaultValue={employee.partnerName ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="partnerPhone">Phone (optional)</Label>
          <Input id="partnerPhone" name="partnerPhone" defaultValue={employee.partnerPhone ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="partnerDateOfBirth">Date of birth (optional)</Label>
          <Input
            id="partnerDateOfBirth"
            name="partnerDateOfBirth"
            type="date"
            defaultValue={employee.partnerDateOfBirth?.slice(0, 10) ?? ""}
          />
        </div>
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save partner details"}
        </Button>
      </div>
    </form>
  )
}
