"use client"

import { useState, type ChangeEvent } from "react"

import { Badge } from "@/components/ui/badge"
import {
  DOCUMENT_STATUS_BADGE_VARIANT,
  DOCUMENT_STATUS_LABELS,
  type OnboardingDocumentAssignment,
} from "@/lib/api/onboarding-documents"
import { uploadOnboardingDocument } from "@/lib/api/onboarding-documents-actions"
import { uploadFile } from "@/lib/api/uploads"

const UPLOADABLE_STATUSES = new Set(["NOT_STARTED", "REJECTED", "RESUBMISSION_REQUIRED"])

function AssignmentRow({ assignment, actingEmployeeId }: { assignment: OnboardingDocumentAssignment; actingEmployeeId: string }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const uploaded = await uploadFile("onboarding-documents", file)
    if (!uploaded.ok) {
      setUploading(false)
      setError(uploaded.error)
      return
    }

    const result = await uploadOnboardingDocument(assignment.id, actingEmployeeId, uploaded.url)
    setUploading(false)
    if (result.error) setError(result.error)
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-foreground">
          {assignment.documentType.name}
          {assignment.documentType.isMandatory ? <span className="ml-1 text-xs text-muted-foreground">(mandatory)</span> : null}
        </p>
        {assignment.documentType.description ? <p className="text-xs text-muted-foreground">{assignment.documentType.description}</p> : null}
        {assignment.reviewComments ? <p className="mt-0.5 text-xs text-amber-600">&quot;{assignment.reviewComments}&quot;</p> : null}
        {assignment.fileUrl ? (
          <a href={assignment.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
            View uploaded file
          </a>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={DOCUMENT_STATUS_BADGE_VARIANT[assignment.status]}>{DOCUMENT_STATUS_LABELS[assignment.status]}</Badge>
        {UPLOADABLE_STATUSES.has(assignment.status) ? (
          <div className="flex flex-col items-end gap-1">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              disabled={uploading}
              className="text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:py-1 file:text-xs file:font-medium"
            />
            {uploading ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
        ) : null}
      </div>
    </li>
  )
}

export function OnboardingDocumentList({ assignments, actingEmployeeId }: { assignments: OnboardingDocumentAssignment[]; actingEmployeeId: string }) {
  if (assignments.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">None.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {assignments.map((assignment) => (
        <AssignmentRow key={assignment.id} assignment={assignment} actingEmployeeId={actingEmployeeId} />
      ))}
    </ul>
  )
}
