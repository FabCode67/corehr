import { CalendarDays, CheckCircle2, Clock3, Target } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSession } from "@/lib/get-session"

const STATS = [
  {
    label: "Leave balance",
    value: "14 days",
    hint: "Annual leave remaining",
    icon: CalendarDays,
  },
  {
    label: "Attendance",
    value: "98%",
    hint: "This month",
    icon: Clock3,
  },
  {
    label: "Next review",
    value: "Q3 2026",
    hint: "Performance cycle",
    icon: Target,
  },
  {
    label: "Pending requests",
    value: "1",
    hint: "Awaiting approval",
    icon: CheckCircle2,
  },
]

export default async function StaffDashboardPage() {
  const session = await getSession()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          A quick overview of your employment, leave, and performance status.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.hint}</p>
                </div>
                <Icon className="size-4 shrink-0 text-secondary" />
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employment summary</CardTitle>
          <CardDescription>Pulled from your employee profile.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <SummaryField label="Full name" value={session?.name ?? "—"} />
          <SummaryField label="Job title" value={session?.jobTitle ?? "—"} />
          <SummaryField label="Department" value={session?.department ?? "—"} />
          <SummaryField label="Branch" value={session?.branch ?? "—"} />
          <SummaryField label="Employee ID" value={session?.id ?? "—"} />
          <SummaryField label="Email" value={session?.email ?? "—"} />
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  )
}
