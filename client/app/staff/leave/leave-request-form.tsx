"use client"

import { useActionState, useEffect, useState, type ChangeEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { previewLeaveDays, type LeaveActionState } from "@/lib/api/leave-actions"
import type { LeaveBalance } from "@/lib/api/leave"
import { uploadFile } from "@/lib/api/uploads"

interface Colleague {
  id: string
  firstName: string
  lastName: string
  positionTitle: string | null
}

interface LeaveRequestFormProps {
  balances: LeaveBalance[]
  colleagues: Colleague[]
  action: (prevState: LeaveActionState | undefined, formData: FormData) => Promise<LeaveActionState>
}

/**
 * Self-service leave request form. The leave-type dropdown is built from
 * the employee's own LeaveBalance rows (not the full leave-type catalog) —
 * those rows only exist for types the backend already deemed this employee
 * eligible for (gender restrictions, active types), so no separate
 * eligibility check is needed here.
 */
export function LeaveRequestForm({ balances, colleagues, action }: LeaveRequestFormProps) {
  const [state, formAction, pending] = useActionState<LeaveActionState | undefined, FormData>(
    action,
    undefined
  )

  const [leaveTypeId, setLeaveTypeId] = useState(balances[0]?.leaveTypeId ?? "")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [returnDate, setReturnDate] = useState("")
  const [preview, setPreview] = useState<{ numberOfDays: number; returnDate: string } | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const [attachmentUrl, setAttachmentUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const selectedBalance = balances.find((balance) => balance.leaveTypeId === leaveTypeId)

  useEffect(() => {
    if (!startDate || !endDate) {
      setPreview(null)
      setPreviewError(null)
      return
    }
    if (endDate < startDate) {
      setPreview(null)
      setPreviewError("End date must be on or after the start date.")
      return
    }

    let cancelled = false
    setPreviewLoading(true)
    setPreviewError(null)

    previewLeaveDays(startDate, endDate)
      .then((result) => {
        if (cancelled) return
        setPreview(result)
        setReturnDate(result.returnDate.slice(0, 10))
      })
      .catch(() => {
        if (!cancelled) setPreviewError("Could not calculate working days. Try different dates.")
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [startDate, endDate])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)
    const result = await uploadFile("leave-attachments", file)
    setUploading(false)

    if (!result.ok) {
      setUploadError(result.error)
      return
    }
    setAttachmentUrl(result.url)
  }

  const insufficientBalance =
    selectedBalance && preview ? preview.numberOfDays > selectedBalance.remainingDays : false

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="returnDate" value={returnDate} />
      <input type="hidden" name="attachmentUrl" value={attachmentUrl} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="leaveTypeId">Leave type</Label>
          <Select
            id="leaveTypeId"
            name="leaveTypeId"
            value={leaveTypeId}
            onChange={(event) => setLeaveTypeId(event.target.value)}
            required
          >
            {balances.map((balance) => (
              <option key={balance.leaveTypeId} value={balance.leaveTypeId}>
                {balance.leaveType.name}
              </option>
            ))}
          </Select>
          {selectedBalance ? (
            <p className="text-xs text-muted-foreground">
              {selectedBalance.remainingDays} day(s) remaining this year.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="delegateEmployeeId">Delegate / acting employee (optional)</Label>
          <Select
            id="delegateEmployeeId"
            name="delegateEmployeeId"
            defaultValue=""
          >
            <option value="">None</option>
            {colleagues.map((colleague) => (
              <option key={colleague.id} value={colleague.id}>
                {colleague.firstName} {colleague.lastName}
                {colleague.positionTitle ? ` — ${colleague.positionTitle}` : ""}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endDate">End date</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-sm">
        {previewLoading ? (
          <p className="text-muted-foreground">Calculating working days…</p>
        ) : previewError ? (
          <p className="text-destructive">{previewError}</p>
        ) : preview ? (
          <p className="text-foreground">
            <span className="font-medium">{preview.numberOfDays}</span> working day(s), excluding
            weekends and public holidays. Return to work on{" "}
            <span className="font-medium">{returnDate || preview.returnDate.slice(0, 10)}</span>.
            {insufficientBalance ? (
              <span className="mt-1 block text-destructive">
                This exceeds your remaining balance ({selectedBalance?.remainingDays} day(s)). HR
                approval with an override will be required.
              </span>
            ) : null}
          </p>
        ) : (
          <p className="text-muted-foreground">Pick a start and end date to preview working days.</p>
        )}
      </div>

      {preview ? (
        <div className="flex flex-col gap-1.5 sm:w-1/2">
          <Label htmlFor="returnDateInput">Return date (editable)</Label>
          <Input
            id="returnDateInput"
            type="date"
            value={returnDate}
            onChange={(event) => setReturnDate(event.target.value)}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reason">Reason</Label>
        <Textarea id="reason" name="reason" rows={2} minLength={3} required />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="attachment">Supporting document (optional)</Label>
        <input
          id="attachment"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileChange}
          className="text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:py-1 file:text-xs file:font-medium"
        />
        {uploading ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
        {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
        {attachmentUrl ? <p className="text-xs text-emerald-600">Attached.</p> : null}
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending || previewLoading}>
          {pending ? "Submitting…" : "Submit leave request"}
        </Button>
      </div>
    </form>
  )
}
