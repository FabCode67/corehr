"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { screenApplication } from "@/lib/api/recruitment-actions"
import type { Application } from "@/lib/api/recruitment"

const DECISIONS = ["SHORTLIST", "REJECT", "HOLD", "RECOMMEND"] as const

export function ScreeningSection({ application, actingEmployeeId }: { application: Application; actingEmployeeId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [decision, setDecision] = useState<string>(application.screening?.decision ?? "SHORTLIST")
  const [comments, setComments] = useState(application.screening?.comments ?? "")

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await screenApplication(application.id, actingEmployeeId, actingEmployeeId, decision, comments || undefined)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {application.screening ? (
        <p className="text-sm text-muted-foreground">
          Last decision: <span className="font-medium text-foreground">{application.screening.decision}</span> by{" "}
          {application.screening.screenedBy.firstName} {application.screening.screenedBy.lastName} on{" "}
          {new Date(application.screening.screenedAt).toLocaleDateString()}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No screening decision recorded yet.</p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Decision</label>
          <Select value={decision} onChange={(event) => setDecision(event.target.value)} className="w-40">
            {DECISIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
        <Button type="button" size="sm" disabled={pending} onClick={submit}>
          {pending ? "Saving…" : application.screening ? "Update decision" : "Record decision"}
        </Button>
      </div>
      <Textarea placeholder="Comments (optional)" value={comments} onChange={(event) => setComments(event.target.value)} />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
