"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Branch } from "@/lib/api/branches"
import type { JobRequisition } from "@/lib/api/recruitment"
import type { RecruitmentActionState } from "@/lib/api/recruitment-actions"

interface JobPostingFormProps {
  requisitions: JobRequisition[]
  branches: Branch[]
  actingEmployeeId: string
  defaultRequisitionId?: string
  action: (prevState: RecruitmentActionState | undefined, formData: FormData) => Promise<RecruitmentActionState>
  submitLabel: string
}

export function JobPostingForm({ requisitions, branches, actingEmployeeId, defaultRequisitionId, action, submitLabel }: JobPostingFormProps) {
  const [state, formAction, pending] = useActionState<RecruitmentActionState | undefined, FormData>(action, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="actingEmployeeId" value={actingEmployeeId} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="requisitionId">Job requisition</Label>
        <Select id="requisitionId" name="requisitionId" required defaultValue={defaultRequisitionId ?? ""}>
          <option value="" disabled>
            Select…
          </option>
          {requisitions.map((requisition) => (
            <option key={requisition.id} value={requisition.id}>
              {requisition.position.title} — {requisition.department.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="postingTitle">Posting title</Label>
        <Input id="postingTitle" name="postingTitle" required />
      </div>

      <div className="flex gap-6 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="isInternal" defaultChecked />
          Post internally
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="isExternal" />
          Post externally
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="closingDate">Closing date</Label>
          <Input id="closingDate" name="closingDate" type="date" required />
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
          <Label htmlFor="requiredExperience">Required experience (optional)</Label>
          <Input id="requiredExperience" name="requiredExperience" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="responsibilities">Responsibilities</Label>
        <Textarea id="responsibilities" name="responsibilities" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="qualifications">Qualifications</Label>
        <Textarea id="qualifications" name="qualifications" required />
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
