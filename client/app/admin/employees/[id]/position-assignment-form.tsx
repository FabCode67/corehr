"use client"

import { useActionState, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import type { Band } from "@/lib/api/bands"
import type { Department } from "@/lib/api/departments"
import type { Employee } from "@/lib/api/employees"
import type { Position } from "@/lib/api/positions"

import type { ActionState } from "../actions"

interface PositionAssignmentFormProps {
  departments: Department[]
  positions: Position[]
  bands: Band[]
  employees: Pick<Employee, "employeeNumber" | "firstName" | "lastName" | "positionId" | "isActive">[]
  action: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>
}

/**
 * Step 2 of the registration wizard — the *initial* Position Assignment.
 * Department is picked first so the Position dropdown only shows roles in
 * that department (same cascade as the standalone admin Position form).
 * "Reporting Manager (auto-suggest based on Position hierarchy)" from the
 * spec is shown as a live, read-only preview computed from the already-
 * loaded positions/employees data (no extra request needed) as soon as a
 * position is picked — the actual authoritative value is derived
 * server-side the same way once saved (see EmployeesService.getReportingManager).
 */
export function PositionAssignmentForm({
  departments,
  positions,
  bands,
  employees,
  action,
}: PositionAssignmentFormProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    action,
    undefined
  )
  const [departmentId, setDepartmentId] = useState("")
  const [positionId, setPositionId] = useState("")

  const positionsForDepartment = useMemo(
    () => positions.filter((position) => position.departmentId === departmentId),
    [positions, departmentId]
  )

  const reportingManagerPreview = useMemo(() => {
    if (!positionId) return null
    const position = positions.find((candidate) => candidate.id === positionId)
    if (!position?.reportsToPositionId) return "No one — top of the org tree"

    const holders = employees.filter(
      (employee) => employee.isActive && employee.positionId === position.reportsToPositionId
    )
    if (holders.length === 0) return "Vacant position — no one currently holds it"

    return holders.map((holder) => `${holder.firstName} ${holder.lastName}`).join(", ")
  }, [positionId, positions, employees])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assign-departmentId">Department</Label>
          <Select
            id="assign-departmentId"
            value={departmentId}
            onChange={(event) => {
              setDepartmentId(event.target.value)
              setPositionId("")
            }}
            required
          >
            <option value="" disabled>
              Select a department…
            </option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assign-positionId">Position</Label>
          <Select
            id="assign-positionId"
            name="positionId"
            value={positionId}
            onChange={(event) => setPositionId(event.target.value)}
            disabled={!departmentId}
            required
          >
            <option value="" disabled>
              {departmentId ? "Select a position…" : "Select a department first"}
            </option>
            {positionsForDepartment.map((position) => (
              <option key={position.id} value={position.id}>
                {position.title}
                {position.unit ? ` (${position.unit.name})` : ""}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assign-bandId">Band</Label>
          <Select id="assign-bandId" name="bandId" defaultValue="" required>
            <option value="" disabled>
              Select a band…
            </option>
            {bands.map((band) => (
              <option key={band.id} value={band.id}>
                {band.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assign-effectiveFrom">Employment start date</Label>
          <Input id="assign-effectiveFrom" name="effectiveFrom" type="date" required />
        </div>
      </div>

      {positionId ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          Reports to: <span className="text-foreground">{reportingManagerPreview}</span>
        </p>
      ) : null}

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save position assignment"}
        </Button>
      </div>
    </form>
  )
}
