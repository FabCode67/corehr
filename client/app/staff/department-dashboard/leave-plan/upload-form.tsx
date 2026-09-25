"use client"

import { useRef, useState, useTransition } from "react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { uploadAnnualLeavePlan, type AnnualLeavePlanUploadState } from "@/lib/api/annual-leave-plan-actions"

/** Client component so it can hold a File in memory and call the upload
 *  Server Action directly (same pattern as the certifications-section file
 *  input) rather than routing through a <form action> — we want the result
 *  (created/updated/errors) rendered inline without a full page navigation. */
export function AnnualLeavePlanUploadForm({
  departmentId,
  actingEmployeeId,
  year,
}: {
  departmentId: string
  actingEmployeeId: string
  year: number
}) {
  const [state, setState] = useState<AnnualLeavePlanUploadState | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleChange() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return
    setState(null)
    startTransition(async () => {
      const result = await uploadAnnualLeavePlan(departmentId, actingEmployeeId, year, file)
      setState(result)
      if (fileInputRef.current) fileInputRef.current.value = ""
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-4">
      <p className="text-sm font-medium text-foreground">Upload annual leave plan ({year})</p>
      <p className="text-xs text-muted-foreground">
        Download the template below, fill in each employee&apos;s planned leave months, and upload it here. Re-uploading updates
        existing rows for this year rather than duplicating them.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.csv"
        onChange={handleChange}
        disabled={isPending}
        className={cn(
          "text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:py-1 file:text-xs file:font-medium",
          isPending && "opacity-60"
        )}
      />
      {isPending ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
      {state?.summary ? (
        <div className="flex flex-col gap-1 text-xs">
          <p className="font-medium text-foreground">
            {state.summary.created} created · {state.summary.updated} updated
            {state.summary.errors.length > 0 ? ` · ${state.summary.errors.length} row(s) skipped` : ""}
          </p>
          {state.summary.errors.map((error, index) => (
            <p key={index} className="text-destructive">
              {error}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function TemplateDownloadLink({ href }: { href: string }) {
  return (
    <a href={href} className={buttonVariants({ size: "sm", variant: "outline" })}>
      Download template
    </a>
  )
}
