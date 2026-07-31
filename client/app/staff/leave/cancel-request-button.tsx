"use client"

import { useActionState, useEffect, useState, type ChangeEvent } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cancelLeaveRequest, type LeaveActionState } from "@/lib/api/leave-actions"
import { uploadFile } from "@/lib/api/uploads"

/** A dedicated dialog rather than a one-click confirm() — cancellation now
 *  requires a mandatory reason (stored permanently for auditing) and
 *  supports an optional attachment, per the spec. Mirrors ExitDialog's
 *  useActionState + auto-close-on-success pattern. */
export function CancelRequestButton({ requestId, actingEmployeeId }: { requestId: string; actingEmployeeId: string }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<LeaveActionState | undefined, FormData>(
    cancelLeaveRequest.bind(null, requestId, actingEmployeeId),
    undefined
  )

  const [attachmentUrl, setAttachmentUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (state && !state.error) {
      setOpen(false)
    }
  }, [state])

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "destructive", size: "xs" })}>Cancel</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel leave request</DialogTitle>
          <DialogDescription>Your manager and HR will be notified. This can&apos;t be undone.</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-1 flex-col overflow-hidden">
          <DialogBody className="flex flex-col gap-4">
            <input type="hidden" name="attachmentUrl" value={attachmentUrl} />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cancellationReason">
                Reason for cancelling <span className="text-destructive">*</span>
              </Label>
              <Textarea id="cancellationReason" name="cancellationReason" rows={3} minLength={3} required />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="cancelAttachment">Supporting document (optional)</Label>
              <input
                id="cancelAttachment"
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
          </DialogBody>

          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "outline", size: "sm" })}>Keep request</DialogClose>
            <Button type="submit" variant="destructive" size="sm" disabled={pending || uploading}>
              {pending ? "Cancelling…" : "Confirm cancellation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
