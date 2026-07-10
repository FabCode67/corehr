"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Employee } from "@/lib/api/employees"

import type { ActionState } from "../actions"

interface BasicInfoFormProps {
  employee: Employee
  action: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>
}

export function BasicInfoForm({ employee, action }: BasicInfoFormProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    action,
    undefined
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" defaultValue={employee.firstName} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" defaultValue={employee.lastName} required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" defaultValue={employee.email} required />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
