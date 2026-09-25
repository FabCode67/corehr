"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
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
        <Label>Job requisition</Label>
        <SearchableSelect
          options={requisitions.map((requisition) => ({
            value: requisition.id,
            label: `${requisition.position.title} — ${requisition.department.name}`,
          }))}
          name="requisitionId"
          defaultValue={defaultRequisitionId ?? ""}
          required
          clearable={false}
          placeholder="Select…"
          searchPlaceholder="Search requisitions…"
        />
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
          <Label>Branch</Label>
          <SearchableSelect
            options={branches.map((branch) => ({ value: branch.id, label: branch.name }))}
            name="branchId"
            defaultValue=""
            required
            clearable={false}
            placeholder="Select…"
            searchPlaceholder="Search branches…"
          />
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
