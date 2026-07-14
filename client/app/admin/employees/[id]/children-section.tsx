"use client"

import { useActionState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import type { EmployeeChild } from "@/lib/api/employees"

import type { ActionState } from "../actions"

interface ChildrenSectionProps {
  children: EmployeeChild[]
  addAction: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>
  onRemove: (childId: string) => Promise<void>
}

/** Step 4 (Family Information) — children half. Unlimited, added one at a
 *  time via "Add Child", same list+inline-add-form pattern as
 *  Department Units (see app/admin/departments/[id]/add-unit-form.tsx). */
export function ChildrenSection({ children, addAction, onRemove }: ChildrenSectionProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    addAction,
    undefined
  )

  return (
    <div className="flex flex-col gap-3">
      <Label className="text-sm font-medium text-foreground">Children</Label>

      {children.length === 0 ? (
        <p className="text-sm text-muted-foreground">No children on record yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {children.map((child) => (
            <li
              key={child.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <span className="font-medium text-foreground">{child.fullName}</span>
                <Badge variant="outline">{child.gender === "MALE" ? "Male" : "Female"}</Badge>
                <span className="text-xs text-muted-foreground">
                  {child.dateOfBirth.slice(0, 10)}
                </span>
              </span>
              <form action={() => onRemove(child.id)}>
                <button type="submit" className="text-xs font-medium text-destructive hover:underline">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form
        action={formAction}
        className="flex flex-wrap items-end gap-2 border-t border-border pt-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="child-fullName" className="text-xs text-muted-foreground">
            Full name
          </label>
          <Input id="child-fullName" name="fullName" className="w-48" required />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="child-dateOfBirth" className="text-xs text-muted-foreground">
            Date of birth
          </label>
          <Input id="child-dateOfBirth" name="dateOfBirth" type="date" className="w-40" required />
        </div>
        <div className="flex w-32 flex-col gap-1">
          <label htmlFor="child-gender" className="text-xs text-muted-foreground">
            Gender
          </label>
          <Select id="child-gender" name="gender" defaultValue="" required>
            <option value="" disabled>
              Select…
            </option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </Select>
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add child"}
        </Button>
      </form>
      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
    </div>
  )
}
