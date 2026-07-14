"use client"

import { useActionState, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ContractType, Employee } from "@/lib/api/employees"

import type { ActionState } from "../actions"

interface EmploymentDetailsFormProps {
  employee: Employee
  action: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>
}

function addMonthsToDateString(dateStr: string, months: number): string {
  const date = new Date(`${dateStr}T00:00:00`)
  date.setMonth(date.getMonth() + months)
  return date.toISOString().slice(0, 10)
}

/**
 * Step 3 of the registration wizard — entirely optional overall, but two
 * contract-type-specific rules apply once a type is chosen: PERMANENT
 * contracts require a probation end date (auto-defaulted to start + 3
 * months, and editable afterwards so HR can extend it), while TEMPORARY
 * contracts require a contract end date instead. The "previous employee"
 * sub-fields only apply/required when that toggle is on.
 */
export function EmploymentDetailsForm({ employee, action }: EmploymentDetailsFormProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    action,
    undefined
  )
  const [previousEmployee, setPreviousEmployee] = useState(employee.previousEmployee)
  const [contractType, setContractType] = useState<ContractType | "">(employee.contractType ?? "")
  const [startDate, setStartDate] = useState(employee.employmentStartDate?.slice(0, 10) ?? "")
  const [probationEndDate, setProbationEndDate] = useState(
    employee.probationEndDate?.slice(0, 10) ?? ""
  )

  useEffect(() => {
    if (contractType === "PERMANENT" && startDate && !probationEndDate) {
      setProbationEndDate(addMonthsToDateString(startDate, 3))
    }
  }, [contractType, startDate, probationEndDate])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contractType">Contract type</Label>
          <Select
            id="contractType"
            name="contractType"
            value={contractType}
            onChange={(event) => setContractType(event.target.value as ContractType | "")}
          >
            <option value="">Not set</option>
            <option value="PERMANENT">Permanent</option>
            <option value="TEMPORARY">Temporary</option>
            <option value="GRADUATE_TRAINEE">Graduate Trainee</option>
            <option value="INTERN">Intern</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="employmentStartDate">Employment start date</Label>
          <Input
            id="employmentStartDate"
            name="employmentStartDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>
      </div>

      {contractType === "PERMANENT" ? (
        <div className="flex flex-col gap-1.5 sm:w-1/2">
          <Label htmlFor="probationEndDate">
            Probation end date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="probationEndDate"
            name="probationEndDate"
            type="date"
            value={probationEndDate}
            onChange={(event) => setProbationEndDate(event.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Defaults to 3 months from the start date — extend it here anytime.
          </p>
        </div>
      ) : null}

      {contractType === "TEMPORARY" ? (
        <div className="flex flex-col gap-1.5 sm:w-1/2">
          <Label htmlFor="contractEndDate">
            Contract end date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contractEndDate"
            name="contractEndDate"
            type="date"
            defaultValue={employee.contractEndDate?.slice(0, 10) ?? ""}
            required
          />
          <p className="text-xs text-muted-foreground">
            Can be pushed out later if the contract is extended.
          </p>
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="previousEmployee"
          defaultChecked={employee.previousEmployee}
          onChange={(event) => setPreviousEmployee(event.target.checked)}
          className="size-4 rounded border-input"
        />
        Previously worked at the bank
      </label>

      {previousEmployee ? (
        <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="previousEmployeeNumber">Previous employee number</Label>
              <Input
                id="previousEmployeeNumber"
                name="previousEmployeeNumber"
                defaultValue={employee.previousEmployeeNumber ?? ""}
                required={previousEmployee}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="previousPositionHeld">Previous position held</Label>
              <Input
                id="previousPositionHeld"
                name="previousPositionHeld"
                defaultValue={employee.previousPositionHeld ?? ""}
                required={previousEmployee}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="previousDepartment">Previous department</Label>
              <Input
                id="previousDepartment"
                name="previousDepartment"
                defaultValue={employee.previousDepartment ?? ""}
                required={previousEmployee}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="previousExitDate">Previous exit date</Label>
              <Input
                id="previousExitDate"
                name="previousExitDate"
                type="date"
                defaultValue={employee.previousExitDate?.slice(0, 10) ?? ""}
                required={previousEmployee}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="previousReasonForLeaving">Reason for leaving</Label>
            <Textarea
              id="previousReasonForLeaving"
              name="previousReasonForLeaving"
              rows={2}
              defaultValue={employee.previousReasonForLeaving ?? ""}
              required={previousEmployee}
            />
          </div>
        </div>
      ) : null}

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save employment details"}
        </Button>
      </div>
    </form>
  )
}
