"use client"

import { useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { submitCertificate } from "@/lib/api/learning-actions"
import { uploadFile } from "@/lib/api/uploads"

export function CertificateForm({
  assignmentId,
  actingEmployeeId,
}: {
  assignmentId: string
  actingEmployeeId: string
}) {
  const router = useRouter()
  const [certificateUrl, setCertificateUrl] = useState("")
  const [comment, setComment] = useState("")
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    const result = await uploadFile("certificates", file)
    setUploading(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    setCertificateUrl(result.url)
  }

  async function handleSubmit() {
    if (!certificateUrl) {
      setError("Upload your certificate first.")
      return
    }
    setSubmitting(true)
    setError(null)
    const result = await submitCertificate(assignmentId, actingEmployeeId, certificateUrl, comment || undefined)
    setSubmitting(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-foreground">Upload certificate</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileChange}
          className="text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:py-1 file:text-xs file:font-medium"
        />
        {uploading ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
        {certificateUrl ? <p className="text-xs text-emerald-600">Certificate attached.</p> : null}
      </div>

      <Textarea
        placeholder="Optional comment for HR"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div>
        <Button type="button" size="sm" disabled={submitting || uploading} onClick={handleSubmit}>
          {submitting ? "Submitting…" : "Submit certificate for verification"}
        </Button>
      </div>
    </div>
  )
}
