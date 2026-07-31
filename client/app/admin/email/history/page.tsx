import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import { fetchEmailLogs, type EmailStatus } from "@/lib/api/email"

import { RetryButton } from "./retry-button"

const STATUS_BADGE_VARIANT: Record<EmailStatus, "outline" | "success" | "secondary" | "destructive" | "default"> = {
  PENDING: "outline",
  SENT: "success",
  FAILED: "destructive",
  RETRYING: "secondary",
}

const STATUSES: EmailStatus[] = ["PENDING", "SENT", "FAILED", "RETRYING"]

export default async function EmailHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const params = await searchParams
  const page = params.page ? Number(params.page) : 1

  const result = await fetchEmailLogs({ status: params.status, page })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Email History</h1>
        <p className="text-sm text-muted-foreground">Every email queued, sent, or failed across the whole system.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link
          href="/admin/email/history"
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${!params.status ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
        >
          All
        </Link>
        {STATUSES.map((status) => (
          <Link
            key={status}
            href={`/admin/email/history?status=${status}`}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${params.status === status ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
          >
            {status}
          </Link>
        ))}
      </div>

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : result.data.data.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">No emails yet</CardTitle>
            <CardDescription>Emails sent by the system will show up here.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Template</th>
                    <th className="px-4 py-3 font-medium">Recipient</th>
                    <th className="px-4 py-3 font-medium">Subject</th>
                    <th className="px-4 py-3 font-medium">Module</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.data.data.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{log.templateKey}</td>
                      <td className="px-4 py-3 text-muted-foreground">{log.recipientEmail}</td>
                      <td className="px-4 py-3 text-muted-foreground">{log.subject}</td>
                      <td className="px-4 py-3 text-muted-foreground">{log.relatedModule ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Badge variant={STATUS_BADGE_VARIANT[log.status]}>{log.status}</Badge>
                          {log.failureReason ? (
                            <span className="max-w-[220px] truncate text-xs text-destructive" title={log.failureReason}>
                              {log.failureReason}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">{log.status === "FAILED" ? <RetryButton id={log.id} /> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination
            page={result.data.page}
            totalPages={result.data.totalPages}
            total={result.data.total}
            pageSize={result.data.pageSize}
            basePath="/admin/email/history"
            searchParams={{ status: params.status }}
          />
        </>
      )}
    </div>
  )
}
