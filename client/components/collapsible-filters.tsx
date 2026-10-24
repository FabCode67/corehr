"use client"

import { ChevronDown, SlidersHorizontal } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Card } from "@/components/ui/card"

export interface FilterChip {
  label: string
  value: string
}

/**
 * Compact filter toolbar: a "Filters" toggle with an active-count badge, chips
 * summarising what is applied, and a Reset link. The full form lives in a panel
 * that stays collapsed until opened (children remain mounted so the form works).
 */
export function CollapsibleFilters({
  chips,
  resetHref,
  description,
  children,
}: {
  chips: FilterChip[]
  resetHref: string
  description?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <Card className="gap-0 p-0">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted"
        >
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          Filters
          {chips.length > 0 ? (
            <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">{chips.length}</span>
          ) : null}
          <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {chips.length === 0 ? (
          <span className="text-sm text-muted-foreground">{description ?? "No filters applied — showing everything."}</span>
        ) : (
          <>
            {chips.map((c) => (
              <span key={c.label} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">
                <span className="text-muted-foreground">{c.label}:</span> {c.value}
              </span>
            ))}
            <a href={resetHref} className="ml-auto text-xs font-medium text-primary hover:underline">
              Clear all
            </a>
          </>
        )}
      </div>

      <div className={open ? "border-t border-border px-4 py-4" : "hidden"}>{children}</div>
    </Card>
  )
}
