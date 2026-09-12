"use client"

import type { NameType, Payload, ValueType } from "recharts/types/component/DefaultTooltipContent"

/** Same dark-card tooltip treatment as the HR Analytics dashboard's
 *  ChartTooltip (app/admin/hr-analytics/chart-tooltip.tsx) — duplicated
 *  locally rather than imported cross-portal so the Staff Portal doesn't
 *  reach into admin-only code for a small shared presentational piece. */
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
            <span className="font-semibold text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
