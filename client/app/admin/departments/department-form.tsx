"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { SearchableSelectAsync } from "@/components/ui/searchable-select-async"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Department, OrgFunction } from "@/lib/api/departments"
import { searchEmployeesAction } from "@/lib/api/employees-actions"
import { fullName } from "@/lib/format-name"

import type { ActionState } from "./actions"

interface DepartmentFormProps {
  functions: OrgFunction[]
  /** Every other department, for the optional Parent Department picker —
   *  callers should exclude `department` itself (obvious self-reference;
   *  the server also rejects it and any cycle regardless). */
  departments?: Department[]
  department?: Department
  action: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>
  submitLabel: string
}

export function DepartmentForm({
  functions,
  departments = [],
  department,
  action,
  submitLabel,
}: DepartmentFormProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    action,
    undefined
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="functionId">Function</Label>
        <Select id="functionId" name="functionId" defaultValue={department?.functionId ?? ""} required>
          <option value="" disabled>
            Select a function…
          </option>
          {functions.map((fn) => (
            <option key={fn.id} value={fn.id}>
              {fn.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={department?.name} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">Code (optional)</Label>
        <Input id="code" name="code" defaultValue={department?.code ?? ""} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="parentDepartmentId">Parent Department (optional)</Label>
        <SearchableSelect
          options={departments.map((candidate) => ({ value: candidate.id, label: candidate.name }))}
          name="parentDepartmentId"
          defaultValue={department?.parentDepartmentId ?? ""}
          placeholder="None"
          searchPlaceholder="Search departments…"
        />
        <p className="text-xs text-muted-foreground">
          A genuine Department-to-Department hierarchy, separate from Function above. Org chart and dashboards still key off Function only.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="headOfDepartmentId">Head of Department (optional)</Label>
        <SearchableSelectAsync
          loadOptions={searchEmployeesAction}
          initialOption={
            department?.headOfDepartment
              ? { value: department.headOfDepartment.employeeNumber, label: `${fullName(department.headOfDepartment)} (${department.headOfDepartment.employeeNumber})` }
              : null
          }
          name="headOfDepartmentId"
          defaultValue={department?.headOfDepartmentId ?? ""}
          placeholder="None"
          searchPlaceholder="Search employees by name or staff ID…"
        />
        <p className="text-xs text-muted-foreground">
          Grants this person access to the Department Dashboard in their Staff Portal, with reports scoped to this department.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="actingHeadOfDepartmentId">Acting Head of Department (optional)</Label>
        <SearchableSelectAsync
          loadOptions={searchEmployeesAction}
          initialOption={
            department?.actingHeadOfDepartment
              ? { value: department.actingHeadOfDepartment.employeeNumber, label: `${fullName(department.actingHeadOfDepartment)} (${department.actingHeadOfDepartment.employeeNumber})` }
              : null
          }
          name="actingHeadOfDepartmentId"
          defaultValue={department?.actingHeadOfDepartmentId ?? ""}
          placeholder="None"
          searchPlaceholder="Search employees by name or staff ID…"
        />
        <p className="text-xs text-muted-foreground">
          Temporary stand-in with the exact same access as Head of Department above — for when the real head is on leave or the role is vacant. Set and cleared manually; clear it once the head is back.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" defaultValue={department?.description ?? ""} />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  )
}
