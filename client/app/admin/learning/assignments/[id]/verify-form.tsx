"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { rejectCertificate, verifyCertificate } from "@/lib/api/learning-actions"

export function VerifyForm({
  assignmentId,
  actingEmployeeId,
}: {
  assignmentId: string
  actingEmployeeId: string
}) {
  const router = useRouter()
  const [comment, setComment] = useState("")
  const [pending, setPending] = useState<"verify" | "reject" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify() {
    setPending("verify")
    setError(null)
    const result = await verifyCertificate(assignmentId, actingEmployeeId, comment || undefined)
    setPending(null)
    if (result?.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  async function handleReject() {
    if (!comment.trim()) {
      setError("A comment is required when rejecting a certificate.")
      return
    }
    setPending("reject")
    setError(null)
    const result = await rejectCertificate(assignmentId, actingEmployeeId, comment)
    setPending(null)
    if (result?.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        placeholder="Comment (required to reject, optional to verify)"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending !== null} onClick={handleVerify}>
          {pending === "verify" ? "Verifying…" : "Verify certificate"}
        </Button>
        <Button type="button" size="sm" variant="destructive" disabled={pending !== null} onClick={handleReject}>
          {pending === "reject" ? "Rejecting…" : "Reject certificate"}
        </Button>
      </div>
    </div>
  )
}
