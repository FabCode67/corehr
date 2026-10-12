"use client"

import { useActionState, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { computeStaffStatus } from "@/lib/api/employee-utils"
import type { Employee } from "@/lib/api/employees"

import type { ActionState } from "../actions"

interface StaffStatusControlProps {
  employee: Employee
  action: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>
}

/** Staff status flow for someone still employed. The current status is
 *  derived (Probation from the probation end date, Suspended/Disability from
 *  HR's choice here, otherwise Active); exits — Resigned, Terminated,
 *  Retired, Deceased, End of Contract — go through Exit Management instead. */
export function StaffStatusControl({ employee, action }: StaffStatusControlProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(action, undefined)
  const current = computeStaffStatus(employee)
  const [choice, setChoice] = useState(employee.activeStatusOverride ?? "ACTIVE")

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Staff status</p>
          <p className="text-xs text-muted-foreground">
            Reported to BNR in the EDWH report. Resignation, termination, retirement, deceased and end of
            contract are set through Exit Management.
          </p>
        </div>
        <Badge variant="secondary">
          {current.code} — {current.label}
        </Badge>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staffStatus">Change status</Label>
          <Select id="staffStatus" name="status" value={choice} onChange={(e) => setChoice(e.target.value as typeof choice)}>
            <option value="ACTIVE">Active (clears Suspended / Disability)</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DISABILITY">Disability</option>
          </Select>
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Update status"}
        </Button>
      </div>
      {employee.probationEndDate && new Date(employee.probationEndDate).getTime() > Date.now() && !employee.activeStatusOverride ? (
        <p className="text-xs text-muted-foreground">
          Currently on probation until {employee.probationEndDate.slice(0, 10)} — becomes Active automatically afterwards.
        </p>
      ) : null}
      {state?.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
    </form>
  )
}
