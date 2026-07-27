import type { AuditLogEntry } from "@/lib/api/performance"

export function AuditLogList({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="py-2 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
  }

  return (
    <ul className="flex flex-col gap-2 text-sm">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
          <div>
            <p className="font-medium text-foreground">{entry.action.replaceAll("_", " ")}</p>
            <p className="text-xs text-muted-foreground">
              {entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : "System"}
              {entry.notes ? ` · ${entry.notes}` : ""}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(entry.createdAt).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  )
}
