"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { issueSanction, type ErActionState } from "@/lib/api/employee-relations-actions"
import type { SanctionType } from "@/lib/api/employee-relations"

interface EmployeeOption {
  employeeNumber: string
  firstName: string
  lastName: string
}

export function SanctionForm({
  caseId,
  actingEmployeeId,
  sanctionTypes,
  employees,
}: {
  caseId: string
  actingEmployeeId: string
  sanctionTypes: SanctionType[]
  employees: EmployeeOption[]
}) {
  const [state, formAction, pending] = useActionState<ErActionState | undefined, FormData>(issueSanction.bind(null, caseId), undefined)

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <input type="hidden" name="actingEmployeeId" value={actingEmployeeId} />
      <p className="text-sm font-medium text-foreground">Issue a sanction</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sanctionTypeId">Sanction type</Label>
          <Select id="sanctionTypeId" name="sanctionTypeId" required defaultValue="">
            <option value="" disabled>
              Select a sanction type…
            </option>
            {sanctionTypes
              .filter((type) => type.isActive)
              .map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
          </Select>
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
          <Select id="issuedById" name="issuedById" required defaultValue={actingEmployeeId}>
            {employees.map((employee) => (
              <option key={employee.employeeNumber} value={employee.employeeNumber}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="approvalAuthorityId">Approval authority (optional)</Label>
          <Select id="approvalAuthorityId" name="approvalAuthorityId" defaultValue="">
            <option value="">None recorded</option>
            {employees.map((employee) => (
              <option key={employee.employeeNumber} value={employee.employeeNumber}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </Select>
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
