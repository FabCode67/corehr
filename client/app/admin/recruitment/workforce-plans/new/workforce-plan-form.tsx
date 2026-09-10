"use client"

import { useActionState, useRef, useState, type ChangeEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Branch } from "@/lib/api/branches"
import type { Department, UnitWithDepartment } from "@/lib/api/departments"
import type { RecruitmentActionState } from "@/lib/api/recruitment-actions"
import { uploadFile } from "@/lib/api/uploads"

interface WorkforcePlanFormProps {
  departments: Department[]
  units: UnitWithDepartment[]
  branches: Branch[]
  actingEmployeeId: string
  action: (prevState: RecruitmentActionState | undefined, formData: FormData) => Promise<RecruitmentActionState>
  submitLabel: string
}

export function WorkforcePlanForm({ departments, units, branches, actingEmployeeId, action, submitLabel }: WorkforcePlanFormProps) {
  const [state, formAction, pending] = useActionState<RecruitmentActionState | undefined, FormData>(action, undefined)

  const [isBudgeted, setIsBudgeted] = useState("")
  const [memoUrl, setMemoUrl] = useState("")
  const [memoFileName, setMemoFileName] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleMemoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const result = await uploadFile("workforce-plan-memos", file)
    setUploading(false)
    if (!result.ok) {
      setUploadError(result.error)
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }
    setMemoUrl(result.url)
    setMemoFileName(file.name)
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="actingEmployeeId" value={actingEmployeeId} />
      <input type="hidden" name="memoUrl" value={memoUrl} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="e.g. Backend Developer Expansion — IT Channels" required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="departmentId">Department</Label>
          <Select id="departmentId" name="departmentId" required defaultValue="">
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
          <Label htmlFor="unitId">Unit (optional)</Label>
          <Select id="unitId" name="unitId" defaultValue="">
            <option value="">None</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.department.name} – {unit.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="branchId">Branch</Label>
          <Select id="branchId" name="branchId" required defaultValue="">
            <option value="" disabled>
              Select a branch…
            </option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="numberOfPositions">Number of positions</Label>
          <Input id="numberOfPositions" name="numberOfPositions" type="number" min={1} defaultValue={1} required />
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
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" name="priority" defaultValue="MEDIUM">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expectedHiringDate">Expected hiring date (optional)</Label>
          <Input id="expectedHiringDate" name="expectedHiringDate" type="date" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="isBudgeted">Is this budgeted?</Label>
          <Select
            id="isBudgeted"
            name="isBudgeted"
            value={isBudgeted}
            onChange={(event) => setIsBudgeted(event.target.value)}
            required
          >
            <option value="" disabled>
              Select…
            </option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Select>
        </div>

        {isBudgeted === "false" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="memo">Justification memo</Label>
            <input
              ref={fileInputRef}
              id="memo"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleMemoChange}
              className="text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:py-1 file:text-xs file:font-medium"
            />
            {uploading ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
            {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
            {!uploading && memoUrl ? (
              <p className="text-xs text-muted-foreground">
                {memoFileName || "Memo uploaded"} —{" "}
                <a href={memoUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  view
                </a>
              </p>
            ) : null}
          </div>
        ) : (
          <div />
        )}

      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="businessJustification">Business justification</Label>
        <Textarea id="businessJustification" name="businessJustification" required />
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
