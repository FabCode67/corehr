"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Band } from "@/lib/api/bands"
import type { Employee } from "@/lib/api/employees"
import type { PositionLevel } from "@/lib/api/positions"
import type { RecruitmentActionState } from "@/lib/api/recruitment-actions"

interface JobDescriptionFormProps {
  levels: PositionLevel[]
  bands: Band[]
  employees: Employee[]
  action: (prevState: RecruitmentActionState | undefined, formData: FormData) => Promise<RecruitmentActionState>
  submitLabel: string
}

export function JobDescriptionForm({ levels, bands, employees, action, submitLabel }: JobDescriptionFormProps) {
  const [state, formAction, pending] = useActionState<RecruitmentActionState | undefined, FormData>(action, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="jobTitle">Job title</Label>
        <Input id="jobTitle" name="jobTitle" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="jobSummary">Job summary</Label>
        <Textarea id="jobSummary" name="jobSummary" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="keyResponsibilities">Key responsibilities</Label>
        <Textarea id="keyResponsibilities" name="keyResponsibilities" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="requiredQualifications">Required qualifications</Label>
        <Textarea id="requiredQualifications" name="requiredQualifications" required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="requiredCertifications">Required certifications (optional)</Label>
          <Input id="requiredCertifications" name="requiredCertifications" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="requiredExperience">Required experience (optional)</Label>
          <Input id="requiredExperience" name="requiredExperience" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="requiredSkills">Required skills (optional)</Label>
          <Input id="requiredSkills" name="requiredSkills" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="technicalCompetencies">Technical competencies (optional)</Label>
          <Input id="technicalCompetencies" name="technicalCompetencies" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="behaviouralCompetencies">Behavioural competencies (optional)</Label>
          <Input id="behaviouralCompetencies" name="behaviouralCompetencies" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="workLocation">Work location (optional)</Label>
          <Input id="workLocation" name="workLocation" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="requiredLevelId">Required level (optional)</Label>
          <Select id="requiredLevelId" name="requiredLevelId" defaultValue="">
            <option value="">Any level</option>
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="requiredBandId">Required band (optional)</Label>
          <Select id="requiredBandId" name="requiredBandId" defaultValue="">
            <option value="">Any band</option>
            {bands.map((band) => (
              <option key={band.id} value={band.id}>
                {band.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="reportingManagerId">Reporting manager (optional)</Label>
          <Select id="reportingManagerId" name="reportingManagerId" defaultValue="">
            <option value="">None</option>
            {employees.map((employee) => (
              <option key={employee.employeeNumber} value={employee.employeeNumber}>
                {employee.firstName} {employee.lastName}
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
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  )
}
