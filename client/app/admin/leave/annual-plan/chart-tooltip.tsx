"use client"

import type { NameType, Payload, ValueType } from "recharts/types/component/DefaultTooltipContent"

/** Same dark-card tooltip style as hr-analytics/chart-tooltip.tsx — kept as
 *  its own local copy rather than a cross-route import, matching the
 *  existing convention of each chart-bearing page owning its own copy (see
 *  staff/department-dashboard/chart-tooltip.tsx). */
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
