"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RotateCcw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { commitImport, reimportJob } from "@/lib/api/imports-actions"
import type { ImportPreviewResult, ImportRowStatus } from "@/lib/api/imports"

const STATUS_BADGE_VARIANT: Record<ImportRowStatus, "outline" | "success" | "secondary" | "destructive" | "default"> = {
  new: "success",
  updated: "default",
  duplicate: "secondary",
  invalid: "destructive",
}

/**
 * "Re-import" replays the exact file stored on this ImportJob through the
 * same preview → confirm workflow as a fresh upload (re-validated against
 * current reference data, since departments/branches/etc. may have
 * changed since the original run) — it never blindly re-applies the old
 * result.
 */
export function ReimportPanel({ jobId, moduleLabel, actingEmployeeId }: { jobId: string; moduleLabel: string; actingEmployeeId: string }) {
  const router = useRouter()
  const [phase, setPhase] = useState<"idle" | "loading" | "preview" | "importing" | "done">("idle")
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleReimport() {
    setPhase("loading")
    setError(null)
    const state = await reimportJob(jobId, actingEmployeeId)
    if (state.error || !state.preview) {
      setError(state.error ?? "Failed to re-run this import.")
      setPhase("idle")
      return
    }
    setPreview(state.preview)
    setPhase("preview")
  }

  async function handleConfirm() {
    if (!preview) return
    setPhase("importing")
    const state = await commitImport(preview.jobId, actingEmployeeId)
    if (state.error) {
      setError(state.error)
      setPhase("preview")
      return
    }
    setPhase("done")
    router.refresh()
  }

  if (phase === "idle" && !error) {
    return (
      <Button variant="outline" size="sm" onClick={handleReimport} className="w-fit">
        <RotateCcw className="mr-1.5 size-4" />
        Re-import This File
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Re-import — {moduleLabel}</CardTitle>
        <CardDescription>Re-validated against current reference data.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {phase === "loading" ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Re-reading the file…
          </p>
        ) : null}

        {phase === "preview" && preview ? (
          <>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {(["new", "updated", "duplicate", "invalid"] as const).map((status) => (
                <div key={status} className="rounded-md bg-muted px-2 py-2">
                  <p className="text-base font-semibold text-foreground">{preview.counts[status]}</p>
                  <Badge variant={STATUS_BADGE_VARIANT[status]}>{status}</Badge>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleConfirm} disabled={preview.counts.new + preview.counts.updated === 0}>
                Import {preview.counts.new + preview.counts.updated} Record{preview.counts.new + preview.counts.updated === 1 ? "" : "s"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPhase("idle")
                  setPreview(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : null}

        {phase === "importing" ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Importing…
          </p>
        ) : null}

        {phase === "done" ? <p className="text-sm text-emerald-600 dark:text-emerald-400">Import complete — refresh above to see updated totals.</p> : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  )
}
