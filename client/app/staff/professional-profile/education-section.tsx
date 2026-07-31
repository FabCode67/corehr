"use client"

import { useActionState, useRef, useState, type ChangeEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatEnumLabel } from "@/lib/api/employees"
import type { EducationRecord, RecordVerificationStatus } from "@/lib/api/professional-profile"
import { addEducationRecord, removeEducationRecord, type ActionState } from "@/lib/api/professional-profile-actions"
import { uploadFile } from "@/lib/api/uploads"

import { InstitutionPicker } from "./institution-picker"

const EDUCATION_TYPES = ["SECONDARY_SCHOOL", "DIPLOMA", "DEGREE", "MASTERS_DEGREE", "PHD", "PROFESSIONAL_CERTIFICATION", "SHORT_COURSE", "TRAINING", "CERTIFICATE", "COURSE", "WORKSHOP"] as const

const STATUS_VARIANT: Record<RecordVerificationStatus, "outline" | "success" | "destructive"> = {
  PENDING_REVIEW: "outline",
  VERIFIED: "success",
  REJECTED: "destructive",
}

function formatDate(value: string) {
  return new Date(value).getFullYear()
}

export function EducationSection({
  employeeId,
  actingEmployeeId,
  education,
  editable,
}: {
  employeeId: string
  actingEmployeeId: string
  education: EducationRecord[]
  editable: boolean
}) {
  const addAction = addEducationRecord.bind(null, employeeId, actingEmployeeId)
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(addAction, undefined)
  const [certificateUrl, setCertificateUrl] = useState("")
  const [certificateFileName, setCertificateFileName] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const result = await uploadFile("professional-profile", file)
    setUploading(false)
    if (!result.ok) {
      setUploadError(result.error)
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }
    setCertificateUrl(result.url)
    setCertificateFileName(file.name)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Education</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {education.length === 0 ? (
          <p className="text-sm text-muted-foreground">No education records yet.</p>
        ) : (
          <ol className="flex flex-col gap-4 border-l border-border pl-4">
            {education.map((record) => (
              <li key={record.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-primary" />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {formatDate(record.startDate)} — {record.endDate ? formatDate(record.endDate) : "Present"}
                    </p>
                    <p className="font-medium text-foreground">{record.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {record.institution}
                      {record.fieldOfStudy ? ` · ${record.fieldOfStudy}` : ""}
                      {record.grade ? ` · ${record.grade}` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">{formatEnumLabel(record.type)}</Badge>
                      <Badge variant={STATUS_VARIANT[record.verificationStatus]}>{formatEnumLabel(record.verificationStatus)}</Badge>
                    </div>
                    {record.verificationStatus === "REJECTED" && record.hrComment ? (
                      <p className="mt-1 text-xs text-destructive">HR comment: {record.hrComment}</p>
                    ) : null}
                    {record.certificateUrl ? (
                      <a href={record.certificateUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-primary hover:underline">
                        View certificate
                      </a>
                    ) : null}
                  </div>
                  {editable ? (
                    <form action={() => removeEducationRecord(record.id, employeeId)}>
                      <button type="submit" className="shrink-0 text-xs font-medium text-destructive hover:underline">
                        Delete
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}

        {editable ? (
          <form action={formAction} className="flex flex-col gap-3 border-t border-border pt-4">
            <input type="hidden" name="certificateUrl" value={certificateUrl} />
            <input type="hidden" name="certificateFileName" value={certificateFileName} />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="edu-type" className="text-xs text-muted-foreground">
                  Education Level
                </Label>
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
                <Label htmlFor="edu-title" className="text-xs text-muted-foreground">
                  Qualification / Degree Title
                </Label>
                <Input id="edu-title" name="title" required />
              </div>
            </div>

            <InstitutionPicker actingEmployeeId={actingEmployeeId} />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="edu-fieldOfStudy" className="text-xs text-muted-foreground">
                  Field of Study
                </Label>
                <Input id="edu-fieldOfStudy" name="fieldOfStudy" />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="edu-grade" className="text-xs text-muted-foreground">
                  Grade / GPA
                </Label>
                <Input id="edu-grade" name="grade" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="edu-startDate" className="text-xs text-muted-foreground">
                  Start Date
                </Label>
                <Input id="edu-startDate" name="startDate" type="date" required />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="edu-endDate" className="text-xs text-muted-foreground">
                  End Date
                </Label>
                <Input id="edu-endDate" name="endDate" type="date" />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="edu-graduationDate" className="text-xs text-muted-foreground">
                  Graduation Date
                </Label>
                <Input id="edu-graduationDate" name="graduationDate" type="date" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="edu-description" className="text-xs text-muted-foreground">
                Description (optional)
              </Label>
              <Textarea id="edu-description" name="description" rows={2} />
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="edu-certificate" className="text-xs text-muted-foreground">
                  Certificate upload (optional)
                </Label>
                <input
                  ref={fileInputRef}
                  id="edu-certificate"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
            {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
          </form>
        ) : null}
      </CardContent>
    </Card>
  )
}
