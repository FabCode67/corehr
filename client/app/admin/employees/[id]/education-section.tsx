"use client"

import { useActionState, useRef, useState, type ChangeEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatEnumLabel, type EmployeeEducation } from "@/lib/api/employees"
import { uploadFile } from "@/lib/api/uploads"

import type { ActionState } from "../actions"

interface EducationSectionProps {
  education: EmployeeEducation[]
  addAction: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>
  onRemove: (educationId: string) => Promise<void>
}

const EDUCATION_TYPES = [
  "DEGREE",
  "DIPLOMA",
  "CERTIFICATE",
  "PROFESSIONAL_CERTIFICATION",
  "TRAINING",
  "COURSE",
  "WORKSHOP",
] as const

/** Step 5 (Education & Professional Development) — unlimited records,
 *  added one at a time via "Add Education", same pattern as
 *  ChildrenSection / Department Units. */
export function EducationSection({ education, addAction, onRemove }: EducationSectionProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    addAction,
    undefined
  )
  const [certificateUrl, setCertificateUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)
    const result = await uploadFile("certificates", file)
    setUploading(false)

    if (!result.ok) {
      setUploadError(result.error)
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }
    setCertificateUrl(result.url)
  }

  return (
    <div className="flex flex-col gap-3">
      <Label className="text-sm font-medium text-foreground">Education &amp; training records</Label>

      {education.length === 0 ? (
        <p className="text-sm text-muted-foreground">No education or training records yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {education.map((record) => (
            <li key={record.id} className="rounded-lg border border-border px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Badge variant="secondary">{formatEnumLabel(record.type)}</Badge>
                  <span className="font-medium text-foreground">{record.title}</span>
                </span>
                <form action={() => onRemove(record.id)}>
                  <button
                    type="submit"
                    className="text-xs font-medium text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </form>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {record.institution}
                {record.fieldOfStudy ? ` · ${record.fieldOfStudy}` : ""}
                {record.grade ? ` · ${record.grade}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {record.startDate.slice(0, 10)}
                {record.endDate ? ` → ${record.endDate.slice(0, 10)}` : ""}
              </p>
              {record.certificateUrl ? (
                <a
                  href={record.certificateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View certificate
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <form
        action={formAction}
        className="flex flex-col gap-3 border-t border-border pt-4"
      >
        <input type="hidden" name="certificateUrl" value={certificateUrl} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="edu-type" className="text-xs text-muted-foreground">
              Type
            </label>
            <Select id="edu-type" name="type" defaultValue="" required>
              <option value="" disabled>
                Select…
              </option>
              {EDUCATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {formatEnumLabel(type)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="edu-title" className="text-xs text-muted-foreground">
              Qualification / Title
            </label>
            <Input id="edu-title" name="title" required />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="edu-institution" className="text-xs text-muted-foreground">
              Institution
            </label>
            <Input id="edu-institution" name="institution" required />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="edu-fieldOfStudy" className="text-xs text-muted-foreground">
              Field of study
            </label>
            <Input id="edu-fieldOfStudy" name="fieldOfStudy" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="edu-grade" className="text-xs text-muted-foreground">
              Grade / GPA
            </label>
            <Input id="edu-grade" name="grade" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="edu-startDate" className="text-xs text-muted-foreground">
              Start date
            </label>
            <Input id="edu-startDate" name="startDate" type="date" required />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="edu-endDate" className="text-xs text-muted-foreground">
              End date
            </label>
            <Input id="edu-endDate" name="endDate" type="date" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="edu-description" className="text-xs text-muted-foreground">
            Description (optional)
          </label>
          <Textarea id="edu-description" name="description" rows={2} />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="edu-certificate" className="text-xs text-muted-foreground">
              Certificate upload (optional)
            </label>
            <input
              ref={fileInputRef}
              id="edu-certificate"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              className="text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:py-1 file:text-xs file:font-medium"
            />
            {uploading ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
            {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
          </div>
          <Button type="submit" size="sm" disabled={pending || uploading}>
            {pending ? "Adding…" : "Add education"}
          </Button>
        </div>
      </form>
      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
    </div>
  )
}
