"use client"

import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import type { RecruitmentActionState } from "@/lib/api/recruitment-actions"

export function HireForm({
  action,
  defaultStart,
  isTemporary,
}: {
  action: (prev: RecruitmentActionState | undefined, formData: FormData) => Promise<RecruitmentActionState>
  defaultStart: string
  isTemporary: boolean
}) {
  const [state, formAction, pending] = useActionState<RecruitmentActionState | undefined, FormData>(action, undefined)
  const [start, setStart] = useState(defaultStart)

  // Default probation: 6 months after the start date (editable).
  const probation = (() => {
    const d = new Date(start)
    if (Number.isNaN(d.getTime())) return ""
    d.setMonth(d.getMonth() + 6)
    return d.toISOString().slice(0, 10)
  })()

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gender">Gender</Label>
          <Select id="gender" name="gender" required defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maritalStatus">Marital status</Label>
          <Select id="maritalStatus" name="maritalStatus" required defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            <option value="SINGLE">Single</option>
            <option value="MARRIED">Married</option>
            <option value="DIVORCED">Divorced</option>
            <option value="WIDOWED">Widowed</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nationalIdNumber">National ID number</Label>
          <Input id="nationalIdNumber" name="nationalIdNumber" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="employmentStartDate">Start date</Label>
          <Input id="employmentStartDate" name="employmentStartDate" type="date" required value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="probationEndDate">Probation ends</Label>
          <Input id="probationEndDate" name="probationEndDate" type="date" key={probation} defaultValue={probation} />
        </div>
        {isTemporary ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contractEndDate">Contract ends</Label>
            <Input id="contractEndDate" name="contractEndDate" type="date" required />
          </div>
        ) : null}
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Creates the employee, assigns the position and starts mandatory training. IT/HR checklist items stay open for follow-up.</p>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating employee…" : "Hire & create employee"}
        </Button>
      </div>
    </form>
  )
}
