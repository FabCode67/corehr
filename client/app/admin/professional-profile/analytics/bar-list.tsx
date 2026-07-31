import { formatEnumLabel } from "@/lib/api/employees"

export function BarList({ items, formatLabel = false }: { items: { key: string; count: number }[]; formatLabel?: boolean }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>
  }
  const max = Math.max(...items.map((i) => i.count), 1)

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-3 text-sm">
          <span className="w-40 shrink-0 truncate text-foreground">{formatLabel ? formatEnumLabel(item.key) : item.key}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
          <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">{item.count}</span>
        </li>
      ))}
    </ul>
  )
}
