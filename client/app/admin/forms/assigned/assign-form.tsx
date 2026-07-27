"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { assignForm, type FormsActionState } from "@/lib/api/forms-actions"
import type { FormTemplate } from "@/lib/api/forms"

interface EmployeeOption {
  employeeNumber: string
  firstName: string
  lastName: string
}

export function AssignForm({
  templates,
  employees,
  assignedById,
}: {
  templates: FormTemplate[]
  employees: EmployeeOption[]
  assignedById: string
}) {
  const [state, formAction, pending] = useActionState<FormsActionState | undefined, FormData>(assignForm, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="assignedById" value={assignedById} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="formTemplateId">Form template</Label>
        <Select id="formTemplateId" name="formTemplateId" required defaultValue="">
          <option value="" disabled>
            Select a published template…
          </option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.title} (v{template.version})
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="employeeId">Employee</Label>
        <Select id="employeeId" name="employeeId" required defaultValue="">
          <option value="" disabled>
            Select an employee…
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
          <Label htmlFor="dueDate">Due date (optional)</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" name="priority" defaultValue="MEDIUM">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="instructions">Instructions (optional)</Label>
        <Textarea id="instructions" name="instructions" />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Assigning…" : "Assign form"}
        </Button>
      </div>
    </form>
  )
}
