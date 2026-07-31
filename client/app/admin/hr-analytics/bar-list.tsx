/** Horizontal bar list — same pattern as app/admin/leave/analytics/page.tsx's
 *  local HorizontalBarList and the Professional Profile analytics BarList,
 *  kept here as its own small local copy rather than a shared component
 *  since each page's row shape differs slightly. */
export function BarList({ rows }: { rows: { label: string; value: number; sub?: string }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value))

  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No data for this selection.</p>
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3 text-sm">
          <div className="w-36 shrink-0 truncate text-muted-foreground" title={row.label}>
            {row.label}
          </div>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }} />
          </div>
          <div className="w-16 shrink-0 text-right font-medium text-foreground">
            {row.value}
            {row.sub ? <span className="text-muted-foreground"> {row.sub}</span> : null}
          </div>
        </div>
      ))}
    </div>
  )
}
