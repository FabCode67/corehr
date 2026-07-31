import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmailStats } from "@/lib/api/email"

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  SENT: "Sent",
  FAILED: "Failed",
  RETRYING: "Retrying",
}

export default async function EmailHubPage() {
  const statsResult = await fetchEmailStats()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Email Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Manage HR email templates, review delivery history, and retry failed sends.
        </p>
      </div>

      {statsResult.ok ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(["PENDING", "SENT", "FAILED", "RETRYING"] as const).map((status) => (
            <Card key={status}>
              <CardHeader className="pb-2">
                <CardDescription>{STATUS_LABELS[status]}</CardDescription>
                <CardTitle className="text-2xl">{statsResult.data[status] ?? 0}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{statsResult.error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/admin/email/templates">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle className="text-base">Email Templates</CardTitle>
              <CardDescription>
                Edit subject lines and HTML bodies for every automated email — welcome, leave, performance,
                learning, recruitment, exit, and approval notifications.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/email/history">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle className="text-base">Email History</CardTitle>
              <CardDescription>
                Every email sent, queued, or failed — filter by status or module, and retry failed sends.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Not seeing an email arrive?</CardTitle>
          <CardDescription>
            Outgoing email requires MAIL_HOST / MAIL_USER / MAIL_PASSWORD to be set on the server (see
            server/.env.example). Until then, emails are still queued and logged here as FAILED with a clear
            reason — nothing is silently dropped.
            <Badge variant="outline" className="ml-2">
              Gmail SMTP
            </Badge>
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
