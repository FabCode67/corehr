"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select"
import { SearchableSelectAsync } from "@/components/ui/searchable-select-async"
import { Textarea } from "@/components/ui/textarea"
import { issueSanction, type ErActionState } from "@/lib/api/employee-relations-actions"
import type { SanctionType } from "@/lib/api/employee-relations"
import { searchEmployeesAction } from "@/lib/api/employees-actions"

export function SanctionForm({
  caseId,
  actingEmployeeId,
  sanctionTypes,
  issuedByInitialOption,
}: {
  caseId: string
  actingEmployeeId: string
  sanctionTypes: SanctionType[]
  /** {value,label} for `actingEmployeeId` — the "Issued by" picker defaults
   *  to the current user, so the trigger needs to show their name up front
   *  without a search round-trip. Null if it couldn't be resolved. */
  issuedByInitialOption: SearchableSelectOption | null
}) {
  const [state, formAction, pending] = useActionState<ErActionState | undefined, FormData>(issueSanction.bind(null, caseId), undefined)

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <input type="hidden" name="actingEmployeeId" value={actingEmployeeId} />
      <p className="text-sm font-medium text-foreground">Issue a sanction</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sanctionTypeId">Sanction type</Label>
          <SearchableSelect
            options={sanctionTypes
              .filter((type) => type.isActive)
              .map((type) => ({ value: type.id, label: type.name }))}
            name="sanctionTypeId"
            defaultValue=""
            placeholder="Select a sanction type…"
            searchPlaceholder="Search sanction types…"
            clearable={false}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="effectiveDate">Effective date</Label>
          <Input id="effectiveDate" name="effectiveDate" type="date" required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reason">Reason</Label>
        <Textarea id="reason" name="reason" rows={3} required />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="issuedById">Issued by</Label>
          <SearchableSelectAsync
            loadOptions={searchEmployeesAction}
            initialOption={issuedByInitialOption}
            name="issuedById"
            defaultValue={actingEmployeeId}
            placeholder="Select an employee…"
            searchPlaceholder="Search employees…"
            clearable={false}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="approvalAuthorityId">Approval authority (optional)</Label>
          <SearchableSelectAsync
            loadOptions={searchEmployeesAction}
            name="approvalAuthorityId"
            defaultValue=""
            placeholder="None recorded"
            searchPlaceholder="Search employees…"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="comments">Comments (optional)</Label>
        <Textarea id="comments" name="comments" rows={2} />
      </div>

      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Issuing…" : "Issue sanction"}
        </Button>
      </div>
    </form>
  )
}
