import { redirect } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { fetchAuditLog } from "@/lib/api/ai-assistant"
import { getSession } from "@/lib/get-session"

const EVENT_TYPES = ["CHAT_MESSAGE", "TOOL_CALL", "REPORT_GENERATED", "ACTION_PROPOSED", "ACTION_CONFIRMED", "ACTION_EXECUTED", "ACTION_FAILED", "ACTION_REJECTED", "ACCESS_DENIED"]

const EVENT_LABELS: Record<string, string> = {
  CHAT_MESSAGE: "Chat message",
  TOOL_CALL: "Data accessed",
  REPORT_GENERATED: "Report generated",
  ACTION_PROPOSED: "Action proposed",
  ACTION_CONFIRMED: "Action confirmed",
  ACTION_EXECUTED: "Action executed",
  ACTION_FAILED: "Action failed",
  ACTION_REJECTED: "Action rejected",
  ACCESS_DENIED: "Access denied",
}

export default async function AiAuditLogPage({ searchParams }: { searchParams: Promise<{ eventType?: string; page?: string }> }) {
  const { eventType, page } = await searchParams
  const session = await getSession()
  if (session?.role !== "admin") redirect("/admin/ai-assistant")

  const result = await fetchAuditLog(session.employeeId, { eventType, page: page ? Number(page) : undefined })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">AI Assistant Audit Log</h1>
        <p className="text-sm text-muted-foreground">Every chat message, data access, report generated, and administrative action for compliance traceability.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
          <CardDescription>Filter by event type.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Event type</label>
              <Select name="eventType" defaultValue={eventType ?? ""} className="w-56">
                <option value="">All events</option>
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {EVENT_LABELS[type]}
                  </option>
                ))}
              </Select>
            </div>
            <button type="submit" className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80">
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {!result.ok ? (
            <p className="p-4 text-sm text-destructive">{result.error}</p>
          ) : result.data.rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No events logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">When</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Employee</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Event</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.rows.map((row) => (
                    <tr key={row.id} className="border-t border-border align-top">
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-foreground">
                        {row.employee.firstName} {row.employee.lastName} ({row.employee.employeeNumber})
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-foreground">{EVENT_LABELS[row.eventType] ?? row.eventType}</td>
                      <td className="max-w-md truncate px-3 py-2 text-muted-foreground" title={JSON.stringify(row.detail)}>
                        {JSON.stringify(row.detail)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {result.ok && (
        <p className="text-xs text-muted-foreground">
          Page {result.data.page} — {result.data.total} total events.
        </p>
      )}
    </div>
  )
}
