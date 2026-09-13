"use client"

import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import type { Band } from "@/lib/api/bands"
import type { Branch } from "@/lib/api/branches"
import type { DepartmentActionState } from "@/lib/api/department-dashboard-actions"
import type { DepartmentPosition, EligibleWorkforcePlan } from "@/lib/api/department-dashboard"
import type { JobDescription } from "@/lib/api/recruitment"
import type { PositionLevel } from "@/lib/api/positions"
import type { UnitWithDepartment } from "@/lib/api/departments"

interface DepartmentRequisitionFormProps {
  workforcePlans: EligibleWorkforcePlan[]
  positions: DepartmentPosition[]
  units: UnitWithDepartment[]
  levels: PositionLevel[]
  bands: Band[]
  branches: Branch[]
  jobDescriptions: JobDescription[]
  action: (prevState: DepartmentActionState | undefined, formData: FormData) => Promise<DepartmentActionState>
}

export function DepartmentRequisitionForm({
  workforcePlans,
  positions,
  units,
  levels,
  bands,
  branches,
  jobDescriptions,
  action,
}: DepartmentRequisitionFormProps) {
  const [state, formAction, pending] = useActionState<DepartmentActionState | undefined, FormData>(action, undefined)
  const [positionMode, setPositionMode] = useState<"existing" | "new">("existing")

  if (workforcePlans.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No approved workforce plan exists yet for your department — ask HR to approve one before a requisition can be
        created against it.
      </p>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="workforcePlanId">Workforce plan</Label>
        <Select id="workforcePlanId" name="workforcePlanId" required defaultValue="">
          <option value="" disabled>
            Select an approved plan…
          </option>
          {workforcePlans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.title}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
        <p className="text-xs font-medium text-muted-foreground">Position</p>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="positionMode"
              checked={positionMode === "existing"}
              onChange={() => setPositionMode("existing")}
            />
            Use an existing position
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="positionMode" checked={positionMode === "new"} onChange={() => setPositionMode("new")} />
            Create a new position
          </label>
        </div>

        {positionMode === "existing" ? (
          <Select name="positionId" defaultValue="" required={positionMode === "existing"}>
            <option value="" disabled>
              Select a position…
            </option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.title} {position.isVacant ? "(vacant)" : ""}
              </option>
            ))}
          </Select>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="newPositionTitle">New position title</Label>
              <Input id="newPositionTitle" name="newPositionTitle" required={positionMode === "new"} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPositionUnitId">Unit (optional)</Label>
              <Select id="newPositionUnitId" name="newPositionUnitId" defaultValue="">
                <option value="">None</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPositionLevelId">Level</Label>
              <Select id="newPositionLevelId" name="newPositionLevelId" defaultValue="" required={positionMode === "new"}>
                <option value="" disabled>
                  Select…
                </option>
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPositionReportsToPositionId">Reports to (optional)</Label>
              <Select id="newPositionReportsToPositionId" name="newPositionReportsToPositionId" defaultValue="">
                <option value="">None</option>
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.title}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bandId">Band</Label>
          <Select id="bandId" name="bandId" required defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {bands.map((band) => (
              <option key={band.id} value={band.id}>
                {band.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="numberOfVacancies">Number of vacancies</Label>
          <Input id="numberOfVacancies" name="numberOfVacancies" type="number" min={1} defaultValue={1} required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contractType">Contract type</Label>
          <Select id="contractType" name="contractType" required defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            <option value="PERMANENT">Permanent</option>
            <option value="TEMPORARY">Temporary</option>
            <option value="GRADUATE_TRAINEE">Graduate Trainee</option>
            <option value="INTERN">Intern</option>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="branchId">Branch</Label>
          <Select id="branchId" name="branchId" required defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="employmentType">Employment type</Label>
          <Select id="employmentType" name="employmentType" required defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            <option value="FULL_TIME">Full time</option>
            <option value="PART_TIME">Part time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERNSHIP">Internship</option>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hiringReason">Hiring reason</Label>
          <Select id="hiringReason" name="hiringReason" required defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            <option value="NEW_POSITION">New position</option>
            <option value="REPLACEMENT">Replacement</option>
            <option value="EXPANSION">Expansion</option>
            <option value="TEMPORARY_REQUIREMENT">Temporary requirement</option>
          </Select>
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="targetStartDate">Target start date (optional)</Label>
          <Input id="targetStartDate" name="targetStartDate" type="date" />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="jobDescriptionId">Job description template (optional)</Label>
          <Select id="jobDescriptionId" name="jobDescriptionId" defaultValue="">
            <option value="">None yet</option>
            {jobDescriptions.map((jobDescription) => (
              <option key={jobDescription.id} value={jobDescription.id}>
                {jobDescription.jobTitle}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Create requisition"}
        </Button>
      </div>
    </form>
  )
}
