import { Briefcase, CalendarClock, TrendingUp, Users } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const STATS = [
  {
    label: "Total headcount",
    value: "1,248",
    hint: "Across all branches",
    icon: Users,
  },
  {
    label: "Open requisitions",
    value: "23",
    hint: "Active job openings",
    icon: Briefcase,
  },
  {
    label: "Turnover rate",
    value: "4.2%",
    hint: "Trailing 12 months",
    icon: TrendingUp,
  },
  {
    label: "Contracts expiring",
    value: "17",
    hint: "Next 90 days",
    icon: CalendarClock,
  },
]

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Executive Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Bank-wide HR metrics across employees, recruitment, and workforce trends.
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
          <CardTitle>Analytics & charts</CardTitle>
          <CardDescription>
            Employee distribution, gender & age analysis, turnover, and department/branch
            comparisons will render here using Apache ECharts once wired to live data from the
            NestJS API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
            Chart placeholder
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
