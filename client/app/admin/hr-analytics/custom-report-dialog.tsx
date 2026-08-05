"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { Briefcase, Building2, CalendarClock, FileSpreadsheet, GraduationCap, Presentation, RefreshCw, TrendingUp, UserMinus, UserRound, Users } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { customReportUrl, type CustomReportSectionSelection, type HrAnalyticsFilters, type ReportSectionMeta } from "@/lib/api/hr-analytics"
import { cn } from "@/lib/utils"

/** Icon per section — keyed by REPORT_SECTIONS' `key` (server-authoritative,
 *  see hr-analytics-export.service.ts). Falls back to Users if the server
 *  ever adds a section this client hasn't been updated to recognize yet, so
 *  a stale deploy degrades gracefully instead of crashing. */
const SECTION_ICONS: Record<string, LucideIcon> = {
  overview: Users,
  demographics: UserRound,
  departments: Building2,
  positions: Briefcase,
  leave: CalendarClock,
  performance: TrendingUp,
  exit: UserMinus,
  turnover: RefreshCw,
  learning: GraduationCap,
}

/** Formats a Date as the yyyy-MM-dd string an `<input type="date">` wants. */
function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * "Build Custom Report" — pick which analytics sections to include, each
 * with its own date range, then export to Excel or PowerPoint. Every
 * section's range is pre-filled with a sensible default (the dashboard's
 * current global filter when one is set, otherwise Jan 1 of this year
 * through today) rather than left blank, so exporting without touching
 * anything still produces a meaningful period. A couple of sections
 * (Departments, Positions) are a snapshot of current org structure with no
 * date dimension in their underlying query — the range still shows for a
 * consistent UI, but a `caveat` from the server explains it won't change
 * that section's output (see REPORT_SECTIONS' doc comment).
 */
export function CustomReportDialog({
  sections,
  filters,
  actingEmployeeId,
}: {
  sections: ReportSectionMeta[]
  filters: HrAnalyticsFilters
  actingEmployeeId: string
}) {
  const [open, setOpen] = useState(false)
  const allKeys = useMemo(() => sections.map((s) => s.key), [sections])
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allKeys))

  const defaultRange = useMemo(() => {
    const now = new Date()
    return {
      dateFrom: filters.dateFrom ?? toDateInputValue(new Date(Date.UTC(now.getUTCFullYear(), 0, 1))),
      dateTo: filters.dateTo ?? toDateInputValue(now),
    }
  }, [filters.dateFrom, filters.dateTo])

  const [ranges, setRanges] = useState<Record<string, { dateFrom?: string; dateTo?: string }>>(() =>
    Object.fromEntries(sections.filter((s) => s.supportsDateRange).map((s) => [s.key, { ...defaultRange }]))
  )

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function setRange(key: string, field: "dateFrom" | "dateTo", value: string) {
    setRanges((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value || undefined } }))
  }

  const selectedKeys = allKeys.filter((key) => selected.has(key))
  const canExport = selectedKeys.length > 0

  const sectionSelections: CustomReportSectionSelection[] = selectedKeys.map((key) => ({
    key,
    dateFrom: ranges[key]?.dateFrom,
    dateTo: ranges[key]?.dateTo,
  }))

  function handleDownloadClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!canExport) {
      e.preventDefault()
      return
    }
    setOpen(false)
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="mr-1.5 size-4" />
        Build Custom Report
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div>
              <DialogTitle>Build Custom Report</DialogTitle>
              <DialogDescription>Choose sections and date ranges, then export to Excel or PowerPoint.</DialogDescription>
            </div>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {selectedKeys.length} of {allKeys.length} sections selected
              </span>
              <div className="flex gap-3">
                <button type="button" onClick={() => setSelected(new Set(allKeys))} className="font-medium text-primary hover:underline">
                  Select all
                </button>
                <button type="button" onClick={() => setSelected(new Set())} className="font-medium text-primary hover:underline">
                  Clear all
                </button>
              </div>
            </div>

            <div className="flex max-h-[26rem] flex-col gap-2 overflow-y-auto pr-1">
              {sections.map((section) => {
                const Icon = SECTION_ICONS[section.key] ?? Users
                const isSelected = selected.has(section.key)
                return (
                  <div
                    key={section.key}
                    className={cn("rounded-lg border px-3 py-2.5 transition-colors", isSelected ? "border-primary/30 bg-primary/5" : "border-border")}
                  >
                    <label className="flex cursor-pointer items-start gap-3">
                      <div className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", isSelected ? "bg-primary/15" : "bg-muted")}>
                        <Icon className={cn("size-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{section.label}</p>
                        <p className="text-xs text-muted-foreground">{section.description}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(section.key)}
                        className="mt-1 size-4 shrink-0 rounded border-border accent-primary"
                      />
                    </label>

                    {isSelected && section.supportsDateRange ? (
                      <div className="mt-2.5 ml-11 flex flex-wrap items-center gap-2 text-xs">
                        <label className="flex items-center gap-1.5 text-muted-foreground">
                          From
                          <input
                            type="date"
                            value={ranges[section.key]?.dateFrom ?? defaultRange.dateFrom}
                            onChange={(e) => setRange(section.key, "dateFrom", e.target.value)}
                            className="rounded-md border border-border bg-background px-1.5 py-1 text-xs text-foreground [color-scheme:light] dark:[color-scheme:dark]"
                          />
                        </label>
                        <label className="flex items-center gap-1.5 text-muted-foreground">
                          To
                          <input
                            type="date"
                            value={ranges[section.key]?.dateTo ?? defaultRange.dateTo}
                            onChange={(e) => setRange(section.key, "dateTo", e.target.value)}
                            className="rounded-md border border-border bg-background px-1.5 py-1 text-xs text-foreground [color-scheme:light] dark:[color-scheme:dark]"
                          />
                        </label>
                        {section.caveat ? <span className="text-[11px] text-muted-foreground/70 italic">{section.caveat}</span> : null}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>

            {!canExport ? <p className="text-sm text-destructive">Select at least one section to export.</p> : null}
          </DialogBody>

          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "outline", size: "sm" })}>Cancel</DialogClose>
            <a
              href={canExport ? customReportUrl(sectionSelections, "xlsx", filters, actingEmployeeId) : undefined}
              aria-disabled={!canExport}
              onClick={handleDownloadClick}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), !canExport && "pointer-events-none opacity-50")}
            >
              <FileSpreadsheet className="mr-1.5 size-4" />
              Excel
            </a>
            <a
              href={canExport ? customReportUrl(sectionSelections, "pptx", filters, actingEmployeeId) : undefined}
              aria-disabled={!canExport}
              onClick={handleDownloadClick}
              className={cn(buttonVariants({ size: "sm" }), !canExport && "pointer-events-none opacity-50")}
            >
              <Presentation className="mr-1.5 size-4" />
              PowerPoint
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
