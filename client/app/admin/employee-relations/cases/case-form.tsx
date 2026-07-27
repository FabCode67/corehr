"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createDisciplinaryCase, type ErActionState } from "@/lib/api/employee-relations-actions"
import { formatErEnum, type DisciplinaryCaseCategory } from "@/lib/api/employee-relations"

interface EmployeeOption {
  employeeNumber: string
  firstName: string
  lastName: string
}

const CATEGORIES: DisciplinaryCaseCategory[] = [
  "MISCONDUCT",
  "ATTENDANCE",
  "INSUBORDINATION",
  "HARASSMENT",
  "DISCRIMINATION",
  "FRAUD",
  "POLICY_VIOLATION",
  "SAFETY_VIOLATION",
  "PERFORMANCE_ISSUE",
  "CONFIDENTIALITY_BREACH",
  "OTHER",
]

export function CaseForm({ employees, reportedById }: { employees: EmployeeOption[]; reportedById: string }) {
  const [state, formAction, pending] = useActionState<ErActionState | undefined, FormData>(createDisciplinaryCase, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="reportedById" value={reportedById} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="employeeId">Employee</Label>
        <Select id="employeeId" name="employeeId" required defaultValue="">
          <option value="" disabled>
            Select the employee involved…
          </option>
          {employees.map((employee) => (
            <option key={employee.employeeNumber} value={employee.employeeNumber}>
              {employee.firstName} {employee.lastName} ({employee.employeeNumber})
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Case category</Label>
          <Select id="category" name="category" required defaultValue="">
            <option value="" disabled>
              Select a category…
            </option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {formatErEnum(category)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="incidentDate">Incident date</Label>
          <Input id="incidentDate" name="incidentDate" type="date" required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="incidentLocation">Incident location (optional)</Label>
        <Input id="incidentLocation" name="incidentLocation" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description of the incident</Label>
        <Textarea id="description" name="description" rows={5} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="witnesses">Witnesses (optional, comma-separated)</Label>
        <Input id="witnesses" name="witnesses" placeholder="e.g. Jane Doe, John Smith" />
      </div>

      <div className="flex gap-6 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="investigationRequired" className="size-4 rounded border-input" />
          Investigation required
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="isConfidential" className="size-4 rounded border-input" />
          Confidential — hide from line manager
        </label>
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create case"}
        </Button>
      </div>
    </form>
  )
}
