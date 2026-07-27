"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { rejectForm, returnFormForCorrection, signForm } from "@/lib/api/forms-actions"

export function SignaturePanel({ signatureId, actingEmployeeId }: { signatureId: string; actingEmployeeId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<"none" | "reject" | "return">("none")
  const [comments, setComments] = useState("")

  function run(action: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result?.error) {
        setError(result.error)
        return
      }
      setMode("none")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <p className="text-sm font-medium text-foreground">Your signature is required on this form.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => run(() => signForm(signatureId, actingEmployeeId))}>
          {pending ? "Signing…" : "Sign"}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setMode(mode === "return" ? "none" : "return")}>
          Return for correction
        </Button>
        <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => setMode(mode === "reject" ? "none" : "reject")}>
          Reject
        </Button>
      </div>

      {mode !== "none" ? (
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder={mode === "reject" ? "Reason for rejection…" : "What needs to be corrected?"}
            value={comments}
            onChange={(event) => setComments(event.target.value)}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant={mode === "reject" ? "destructive" : "default"}
              disabled={pending || comments.trim().length === 0}
              onClick={() =>
                run(() =>
                  mode === "reject"
                    ? rejectForm(signatureId, actingEmployeeId, comments.trim())
                    : returnFormForCorrection(signatureId, actingEmployeeId, comments.trim())
                )
              }
            >
              {pending ? "Saving…" : mode === "reject" ? "Confirm rejection" : "Send back to employee"}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
