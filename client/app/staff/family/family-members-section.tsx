"use client"

import { useActionState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { formatEnumLabel, type EmployeeFamilyMember } from "@/lib/api/employees"

import type { ActionState } from "./actions"

interface FamilyMembersSectionProps {
  familyMembers: EmployeeFamilyMember[]
  addAction: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>
  onRemove: (familyMemberId: string) => Promise<void>
}

/** Parents, siblings, and any other dependent that doesn't fit the wizard's
 *  dedicated Spouse/Children fields — the generic EmployeeFamilyMember
 *  sub-resource (see its schema doc comment). Same list+inline-add-form
 *  pattern as ChildrenSection, just with a Relationship picker since this
 *  one table covers five different relationship types at once. */
export function FamilyMembersSection({ familyMembers, addAction, onRemove }: FamilyMembersSectionProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(addAction, undefined)

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label className="text-sm font-medium text-foreground">Other family members</Label>
        <p className="text-xs text-muted-foreground">Parents, siblings, or anyone else not covered above.</p>
      </div>

      {familyMembers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No other family members on record yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {familyMembers.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{formatEnumLabel(member.relationship)}</Badge>
                <span className="font-medium text-foreground">{member.name}</span>
                {member.gender ? <span className="text-xs text-muted-foreground">{formatEnumLabel(member.gender)}</span> : null}
                {member.dateOfBirth ? <span className="text-xs text-muted-foreground">{member.dateOfBirth.slice(0, 10)}</span> : null}
                {member.occupation ? <span className="text-xs text-muted-foreground">{member.occupation}</span> : null}
                {member.contactNumber ? <span className="text-xs text-muted-foreground">{member.contactNumber}</span> : null}
              </span>
              <form action={() => onRemove(member.id)}>
                <button type="submit" className="text-xs font-medium text-destructive hover:underline">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="familyMember-name" className="text-xs text-muted-foreground">
            Full name
          </label>
          <Input id="familyMember-name" name="name" className="w-44" required />
        </div>
        <div className="flex w-36 flex-col gap-1">
          <label htmlFor="familyMember-relationship" className="text-xs text-muted-foreground">
            Relationship
          </label>
          <Select id="familyMember-relationship" name="relationship" defaultValue="" required>
            <option value="" disabled>
              Select…
            </option>
            <option value="PARENT">Parent</option>
            <option value="SIBLING">Sibling</option>
            <option value="SPOUSE">Spouse</option>
            <option value="CHILD">Child</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>
        <div className="flex w-28 flex-col gap-1">
          <label htmlFor="familyMember-gender" className="text-xs text-muted-foreground">
            Gender
          </label>
          <Select id="familyMember-gender" name="gender" defaultValue="">
            <option value="">—</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="familyMember-dateOfBirth" className="text-xs text-muted-foreground">
            Date of birth
          </label>
          <Input id="familyMember-dateOfBirth" name="dateOfBirth" type="date" className="w-40" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="familyMember-occupation" className="text-xs text-muted-foreground">
            Occupation
          </label>
          <Input id="familyMember-occupation" name="occupation" className="w-36" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="familyMember-contactNumber" className="text-xs text-muted-foreground">
            Contact number
          </label>
          <Input id="familyMember-contactNumber" name="contactNumber" className="w-36" />
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add family member"}
        </Button>
      </form>
      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
    </div>
  )
}
