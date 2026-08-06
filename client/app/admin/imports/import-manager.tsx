"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Download, History, Loader2, Upload, UploadCloud } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { commitImport, previewImport } from "@/lib/api/imports-actions"
import {
  importErrorReportUrl,
  importJobFileUrl,
  importSuccessReportUrl,
  importTemplateUrl,
  type ImportJobDetail,
  type ImportPreviewResult,
  type ImportRowStatus,
} from "@/lib/api/imports"

const STATUS_LABELS: Record<ImportRowStatus, string> = {
  new: "New",
  updated: "Updated",
  duplicate: "Duplicate",
  invalid: "Invalid",
}

const STATUS_BADGE_VARIANT: Record<ImportRowStatus, "outline" | "success" | "secondary" | "destructive" | "default"> = {
  new: "success",
  updated: "default",
  duplicate: "secondary",
  invalid: "destructive",
}

type Phase = "idle" | "previewing" | "preview" | "importing" | "done"

/**
 * The one reusable import widget every HR module page mounts with just
 * `<ImportManager moduleKey="..." moduleLabel="..." />`. Nothing here is
 * module-specific — the server-side registry (server/src/modules/imports/
 * registry/*.config.ts) is what defines each module's fields/validation;
 * this component only ever talks to the generic /imports/... endpoints.
 */
export function ImportManager({ moduleKey, moduleLabel, actingEmployeeId }: { moduleKey: string; moduleLabel: string; actingEmployeeId: string }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>("idle")
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null)
  const [result, setResult] = useState<ImportJobDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ImportRowStatus | "all">("all")

  function reset() {
    setPhase("idle")
    setPreview(null)
    setResult(null)
    setError(null)
    setActiveTab("all")
    setDragOver(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      const shouldRefresh = phase === "done"
      reset()
      if (shouldRefresh) router.refresh()
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setPhase("previewing")
    const state = await previewImport(moduleKey, actingEmployeeId, file)
    if (state.error || !state.preview) {
      setError(state.error ?? "Failed to read the file.")
      setPhase("idle")
      return
    }
    setPreview(state.preview)
    setPhase("preview")
  }

  async function handleConfirm() {
    if (!preview) return
    setError(null)
    setPhase("importing")
    const state = await commitImport(preview.jobId, actingEmployeeId)
    if (state.error || !state.result) {
      setError(state.error ?? "Failed to run the import.")
      setPhase("preview")
      return
    }
    setResult(state.result)
    setPhase("done")
  }

  const importableCount = preview ? preview.counts.new + preview.counts.updated : 0
  const visibleRows = preview ? (activeTab === "all" ? preview.rows : preview.rows.filter((row) => row.status === activeTab)).slice(0, 200) : []

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Upload className="mr-1.5 size-4" />
          Import
        </Button>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div>
              <DialogTitle>Import {moduleLabel}</DialogTitle>
              <DialogDescription>Upload a CSV or Excel file to bulk-create or update records.</DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {phase === "idle" ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  void handleFile(e.dataTransfer.files?.[0])
                }}
                className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  dragOver ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <UploadCloud className="size-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Drag and drop a .csv or .xlsx file here</p>
                  <p className="text-xs text-muted-foreground">or</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Choose File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={(e) => void handleFile(e.target.files?.[0])}
                />
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
              </div>
            ) : null}

            {phase === "previewing" ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
                Reading and validating the file…
              </div>
            ) : null}

            {phase === "preview" && preview ? (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <CountTile label="New" value={preview.counts.new} tone="success" />
                  <CountTile label="Updated" value={preview.counts.updated} tone="default" />
                  <CountTile label="Duplicate" value={preview.counts.duplicate} tone="secondary" />
                  <CountTile label="Invalid" value={preview.counts.invalid} tone="destructive" />
                </div>

                <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
                  {(["all", "new", "updated", "duplicate", "invalid"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        activeTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
                      }`}
                    >
                      {tab === "all" ? "All" : STATUS_LABELS[tab]} ({tab === "all" ? preview.totalRows : preview.counts[tab]})
                    </button>
                  ))}
                </div>

                <div className="max-h-72 overflow-y-auto rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 border-b border-border bg-muted/60 text-left uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Row</th>
                        <th className="px-3 py-2 font-medium">Reference</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {visibleRows.map((row) => (
                        <tr key={row.row} className={row.status === "invalid" ? "bg-destructive/5" : undefined}>
                          <td className="px-3 py-2 text-muted-foreground">{row.row}</td>
                          <td className="px-3 py-2 font-medium text-foreground">{row.employeeNumber ?? "—"}</td>
                          <td className="px-3 py-2">
                            <Badge variant={STATUS_BADGE_VARIANT[row.status]}>{STATUS_LABELS[row.status]}</Badge>
                          </td>
                          <td className="px-3 py-2 text-destructive">{row.errors.join("; ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.rows.length > visibleRows.length ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">+{preview.rows.length - visibleRows.length} more rows not shown.</p>
                  ) : null}
                </div>

                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {importableCount === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing to import — fix the invalid rows and re-upload.</p>
                ) : null}
              </div>
            ) : null}

            {phase === "importing" ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
                Importing {importableCount} record{importableCount === 1 ? "" : "s"}…
              </div>
            ) : null}

            {phase === "done" && result ? (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-5">
                  <CountTile label="Total" value={result.totalRows} tone="outline" />
                  <CountTile label="New" value={result.newRecords} tone="success" />
                  <CountTile label="Updated" value={result.updatedRecords} tone="default" />
                  <CountTile label="Skipped" value={result.skippedRecords} tone="secondary" />
                  <CountTile label="Failed" value={result.failedRecords} tone="destructive" />
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-xs text-muted-foreground">
                  <span>Duration</span>
                  <span className="text-right text-foreground">{result.durationMs !== null ? `${(result.durationMs / 1000).toFixed(1)}s` : "—"}</span>
                  <span>Imported by</span>
                  <span className="text-right text-foreground">
                    {result.importedBy ? `${result.importedBy.firstName} ${result.importedBy.lastName}` : "—"}
                  </span>
                  <span>Imported on</span>
                  <span className="text-right text-foreground">{new Date(result.completedAt ?? result.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={importErrorReportUrl(result.id)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <Download className="mr-1.5 size-3.5" />
                    Error Report
                  </a>
                  <a href={importSuccessReportUrl(result.id)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <Download className="mr-1.5 size-3.5" />
                    Success Report
                  </a>
                </div>
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            {phase === "preview" ? (
              <>
                <DialogClose className={buttonVariants({ variant: "outline", size: "sm" })} onClick={reset}>
                  Cancel
                </DialogClose>
                <Button size="sm" disabled={importableCount === 0} onClick={handleConfirm}>
                  Import {importableCount} Record{importableCount === 1 ? "" : "s"}
                </Button>
              </>
            ) : phase === "done" ? (
              <DialogClose className={buttonVariants({ size: "sm" })}>Done</DialogClose>
            ) : (
              <DialogClose className={buttonVariants({ variant: "outline", size: "sm" })}>Close</DialogClose>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <a href={importTemplateUrl(moduleKey)} className={buttonVariants({ variant: "outline", size: "sm" })}>
        <Download className="mr-1.5 size-4" />
        Download Template
      </a>

      <Link href={`/admin/imports/history?module=${moduleKey}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
        <History className="mr-1.5 size-4" />
        Import History
      </Link>
    </div>
  )
}

function CountTile({ label, value, tone }: { label: string; value: number; tone: "success" | "default" | "secondary" | "destructive" | "outline" }) {
  const toneClasses: Record<typeof tone, string> = {
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    default: "bg-primary/10 text-primary",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive/10 text-destructive",
    outline: "bg-muted text-foreground",
  }
  return (
    <div className={`rounded-md px-2 py-2 ${toneClasses[tone]}`}>
      <p className="text-base font-semibold">{value}</p>
      <p className="text-[10px] uppercase tracking-wide opacity-80">{label}</p>
    </div>
  )
}
