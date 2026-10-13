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
import { APPLICATION_DOCUMENT_LABELS, APPLICATION_DOCUMENT_TYPES } from "@/lib/application-documents"

interface JobPostingFormProps {
  requisitions: JobRequisition[]
  branches: Branch[]
  actingEmployeeId: string
  defaultRequisitionId?: string
  defaults?: { title?: string; description?: string; responsibilities?: string; qualifications?: string; branchId?: string; employmentType?: string; requiredExperience?: string }
  action: (prevState: RecruitmentActionState | undefined, formData: FormData) => Promise<RecruitmentActionState>
  submitLabel: string
}

export function JobPostingForm({ requisitions, branches, actingEmployeeId, defaultRequisitionId, defaults = {}, action, submitLabel }: JobPostingFormProps) {
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
        <Input id="postingTitle" name="postingTitle" required defaultValue={defaults.title ?? ""} />
      </div>

      <div className="flex gap-6 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="isInternal" defaultChecked />
          Post internally
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="isExternal" defaultChecked />
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
            defaultValue={defaults.branchId ?? ""}
            required
            clearable={false}
            placeholder="Select…"
            searchPlaceholder="Search branches…"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="employmentType">Employment type</Label>
          <Select id="employmentType" name="employmentType" required defaultValue={defaults.employmentType ?? ""}>
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
          <Input id="requiredExperience" name="requiredExperience" defaultValue={defaults.requiredExperience ?? ""} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={5} required defaultValue={defaults.description ?? ""} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="responsibilities">Responsibilities</Label>
        <Textarea id="responsibilities" name="responsibilities" rows={7} required defaultValue={defaults.responsibilities ?? ""} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="qualifications">Qualifications</Label>
        <Textarea id="qualifications" name="qualifications" rows={6} required defaultValue={defaults.qualifications ?? ""} />
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
        <p className="text-sm font-medium">Documents candidates must upload</p>
        <p className="text-xs text-muted-foreground">A CV is always required. Tick anything else you need at application time.</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {APPLICATION_DOCUMENT_TYPES.filter((t) => t !== "CV").map((type) => (
            <label key={type} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="requiredDocuments" value={type} defaultChecked={type === "ID_DOCUMENT" || type === "ACADEMIC_CERTIFICATES"} />
              {APPLICATION_DOCUMENT_LABELS[type]}
            </label>
          ))}
        </div>
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
