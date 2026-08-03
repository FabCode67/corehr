import Link from "next/link"
import { Briefcase, CalendarClock, TrendingUp, Users } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MandatoryTrainingBanner } from "@/components/portal/mandatory-training-banner"
import { fetchEmployees } from "@/lib/api/employees"
import { fetchAttritionRate, fetchRecruitmentAnalytics, fetchTotalStaff } from "@/lib/api/hr-analytics"
import { getSession } from "@/lib/get-session"

const CONTRACT_EXPIRY_WINDOW_DAYS = 90

export default async function AdminDashboardPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [totalStaffResult, attritionRateResult, recruitmentResult, employeesResult] = await Promise.all([
    fetchTotalStaff({}, actingEmployeeId),
    fetchAttritionRate({}, actingEmployeeId),
    fetchRecruitmentAnalytics(actingEmployeeId),
    fetchEmployees(),
  ])

  let contractsExpiringCount: number | null = null
  if (employeesResult.ok) {
    const now = new Date()
    const windowEnd = new Date(now.getTime() + CONTRACT_EXPIRY_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    contractsExpiringCount = employeesResult.data.filter((e) => {
      if (!e.contractEndDate) return false
      const end = new Date(e.contractEndDate)
      return end >= now && end <= windowEnd
    }).length
  }

  const stats = [
    {
      label: "Total headcount",
      value: totalStaffResult.ok ? totalStaffResult.data.activeCount.toLocaleString() : "—",
      hint: "Active employees, all branches",
      icon: Users,
    },
    {
      label: "Open requisitions",
      value: recruitmentResult.ok ? String(recruitmentResult.data.overview.openRequisitions) : "—",
      hint: "Active job openings",
      icon: Briefcase,
    },
    {
      label: "Turnover rate",
      value: attritionRateResult.ok ? `${attritionRateResult.data.rate}%` : "—",
      hint: "Trailing 12 months",
      icon: TrendingUp,
    },
    {
      label: "Contracts expiring",
      value: contractsExpiringCount === null ? "—" : String(contractsExpiringCount),
      hint: `Next ${CONTRACT_EXPIRY_WINDOW_DAYS} days`,
      icon: CalendarClock,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Executive Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Bank-wide HR metrics across employees, recruitment, and workforce trends.
        </p>
      </div>

      <MandatoryTrainingBanner actingEmployeeId={session?.employeeId ?? ""} myLearningHref="/staff/learning" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
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
            Employee distribution, gender &amp; age analysis, turnover, and department/branch comparisons are all available on the full HR Analytics dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/admin/hr-analytics"
            className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border text-sm font-medium text-primary hover:bg-muted"
          >
            Open HR Analytics Dashboard →
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
