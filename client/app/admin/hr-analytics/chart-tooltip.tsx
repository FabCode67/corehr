"use client"

import type { NameType, Payload, ValueType } from "recharts/types/component/DefaultTooltipContent"

/**
 * Shared dark-card tooltip used by every chart on this page, replacing
 * recharts' plain white default box — which looked like a foreign element
 * dropped onto a themed card — with something that matches the rest of the
 * design system (same border/shadow/radius as Popover/Dialog content).
 *
 * Props are declared locally (not recharts' own TooltipContentProps) and
 * all optional on purpose: this component is passed as
 * `<Tooltip content={<ChartTooltip />} />` with zero props written at that
 * call site — recharts clones the element and injects active/payload/label
 * itself at runtime, but TypeScript only sees the bare `<ChartTooltip />`
 * JSX literal, so every prop TooltipContentProps marks as required would
 * fail to type-check there even though it's always populated in practice.
 */
interface ChartTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<Payload<ValueType, NameType>>
  label?: string | number
}

export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="min-w-32 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-xl">
      {label !== undefined && label !== null && label !== "" ? (
        <p className="mb-1 border-b border-border pb-1 font-semibold text-foreground">{label}</p>
      ) : null}
      <div className="flex flex-col gap-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: String(entry.color ?? entry.payload?.fill ?? "#0A2647") }} />
              {entry.name}
            </span>
            <span className="font-semibold text-foreground">
              {entry.value}
              {entry.unit ?? ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
