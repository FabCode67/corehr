import { redirect } from "next/navigation"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchNotificationPreference } from "@/lib/api/email"
import { getSession } from "@/lib/get-session"

import { PreferencesForm } from "./preferences-form"

export default async function NotificationPreferencesPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const result = await fetchNotificationPreference(session.employeeId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Notification Preferences</h1>
        <p className="text-sm text-muted-foreground">
          Choose which automated emails you receive. Compliance-critical emails (e.g. mandatory AML training
          reminders, your welcome email) are always sent regardless of these settings.
        </p>
      </div>

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <PreferencesForm employeeId={session.employeeId} preference={result.data} />
      )}
    </div>
  )
}
