"use client"

import { useActionState, useRef, useState, type ChangeEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatEnumLabel } from "@/lib/api/employees"
import type { Certification, RecordVerificationStatus, CertificationStatus } from "@/lib/api/professional-profile"
import { addCertification, removeCertification, type ActionState } from "@/lib/api/professional-profile-actions"
import { uploadFile } from "@/lib/api/uploads"

const STATUS_VARIANT: Record<RecordVerificationStatus, "outline" | "success" | "destructive"> = {
  PENDING_REVIEW: "outline",
  VERIFIED: "success",
  REJECTED: "destructive",
}

const CERT_STATUS_VARIANT: Record<CertificationStatus, "success" | "secondary"> = {
  ACTIVE: "success",
  EXPIRED: "secondary",
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export function CertificationsSection({
  employeeId,
  actingEmployeeId,
  certifications,
  editable,
}: {
  employeeId: string
  actingEmployeeId: string
  certifications: Certification[]
  editable: boolean
}) {
  const addAction = addCertification.bind(null, employeeId, actingEmployeeId)
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
        <CardTitle className="text-base">Certifications</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {certifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No certifications added yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {certifications.map((cert) => (
              <li key={cert.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{cert.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cert.issuer} · Issued {formatDate(cert.issueDate)}
                      {cert.expiryDate ? ` · Expires ${formatDate(cert.expiryDate)}` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant={CERT_STATUS_VARIANT[cert.status]}>{formatEnumLabel(cert.status)}</Badge>
                      <Badge variant={STATUS_VARIANT[cert.verificationStatus]}>{formatEnumLabel(cert.verificationStatus)}</Badge>
                    </div>
                    {cert.verificationStatus === "REJECTED" && cert.hrComment ? (
                      <p className="mt-1 text-xs text-destructive">HR comment: {cert.hrComment}</p>
                    ) : null}
                    {cert.certificateUrl ? (
                      <a href={cert.certificateUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-primary hover:underline">
                        View certificate
                      </a>
                    ) : null}
                  </div>
                  {editable ? (
                    <form action={() => removeCertification(cert.id, employeeId)}>
                      <button type="submit" className="shrink-0 text-xs font-medium text-destructive hover:underline">
                        Delete
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {editable ? (
          <form action={formAction} className="flex flex-col gap-3 border-t border-border pt-4">
            <input type="hidden" name="certificateUrl" value={certificateUrl} />
            <input type="hidden" name="certificateFileName" value={certificateFileName} />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="cert-name" className="text-xs text-muted-foreground">
                  Certification Name
                </Label>
                <Input id="cert-name" name="name" placeholder="e.g. PMP, AWS Certified Solutions Architect" required />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="cert-issuer" className="text-xs text-muted-foreground">
                  Issuing Organization
                </Label>
                <Input id="cert-issuer" name="issuer" required />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="cert-number" className="text-xs text-muted-foreground">
                  Certificate Number (optional)
                </Label>
                <Input id="cert-number" name="certificateNumber" />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="cert-issueDate" className="text-xs text-muted-foreground">
                  Issue Date
                </Label>
                <Input id="cert-issueDate" name="issueDate" type="date" required />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="cert-expiryDate" className="text-xs text-muted-foreground">
                  Expiry Date (optional)
                </Label>
                <Input id="cert-expiryDate" name="expiryDate" type="date" />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="cert-file" className="text-xs text-muted-foreground">
                  Certificate document (optional)
                </Label>
                <input
                  ref={fileInputRef}
                  id="cert-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:py-1 file:text-xs file:font-medium"
                />
                {uploading ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
                {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
              </div>
              <Button type="submit" size="sm" disabled={pending || uploading}>
                {pending ? "Adding…" : "Add certification"}
              </Button>
            </div>
            {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
          </form>
        ) : null}
      </CardContent>
    </Card>
  )
}
