"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import type { Band } from "@/lib/api/bands"
import type { JobDescription, JobRequisition } from "@/lib/api/recruitment"
import type { RecruitmentActionState } from "@/lib/api/recruitment-actions"

interface RequisitionEditFormProps {
  requisition: JobRequisition
  bands: Band[]
  jobDescriptions: JobDescription[]
  action: (prevState: RecruitmentActionState | undefined, formData: FormData) => Promise<RecruitmentActionState>
}

/** Only the fields UpdateRequisitionDto actually accepts — position,
 *  workforce plan, department/unit/function, branch, hiring reason, and the
 *  requester/hiring-manager/recruiter are fixed at creation time (see the
 *  DTO's doc comment) and shown read-only on the detail page instead. */
export function RequisitionEditForm({ requisition, bands, jobDescriptions, action }: RequisitionEditFormProps) {
  const [state, formAction, pending] = useActionState<RecruitmentActionState | undefined, FormData>(action, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Band</Label>
          <SearchableSelect
            options={bands.map((band) => ({ value: band.id, label: band.name }))}
            name="bandId"
            defaultValue={requisition.bandId}
            required
            clearable={false}
            placeholder="Select…"
            searchPlaceholder="Search bands…"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="numberOfVacancies">Number of vacancies</Label>
          <Input id="numberOfVacancies" name="numberOfVacancies" type="number" min={1} defaultValue={requisition.numberOfVacancies} required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contractType">Contract type</Label>
          <Select id="contractType" name="contractType" required defaultValue={requisition.contractType}>
            <option value="PERMANENT">Permanent</option>
            <option value="TEMPORARY">Temporary</option>
            <option value="GRADUATE_TRAINEE">Graduate Trainee</option>
            <option value="INTERN">Intern</option>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="employmentType">Employment type</Label>
          <Select id="employmentType" name="employmentType" required defaultValue={requisition.employmentType}>
            <option value="FULL_TIME">Full time</option>
            <option value="PART_TIME">Part time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERNSHIP">Internship</option>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" name="priority" defaultValue={requisition.priority}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="targetStartDate">Target start date (optional)</Label>
          <Input
            id="targetStartDate"
            name="targetStartDate"
            type="date"
            defaultValue={requisition.targetStartDate ? requisition.targetStartDate.slice(0, 10) : ""}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Job description template (optional)</Label>
          <SearchableSelect
            options={jobDescriptions.map((jobDescription) => ({ value: jobDescription.id, label: jobDescription.jobTitle }))}
            name="jobDescriptionId"
            defaultValue={requisition.jobDescriptionId ?? ""}
            placeholder="None"
            searchPlaceholder="Search job descriptions…"
          />
        </div>
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
