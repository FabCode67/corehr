import { CalendarDays, CheckCircle2, Target, Users } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MandatoryTrainingBanner } from "@/components/portal/mandatory-training-banner"
import { fetchDirectReports } from "@/lib/api/employees"
import { fetchLeaveBalances, fetchLeaveRequests } from "@/lib/api/leave"
import { fetchReviewPeriods, type ReviewPeriod } from "@/lib/api/performance"
import { getSession } from "@/lib/get-session"

/** Picks the review period/cycle worth surfacing on the dashboard: an
 *  in-progress ("OPEN") cycle takes priority since that's the one the
 *  employee might actually need to act on; otherwise falls back to the
 *  current calendar year's period (even if not open yet), then the most
 *  recent period on record. */
function pickNextReview(periods: ReviewPeriod[]): { label: string; hint: string } {
  if (periods.length === 0) return { label: "—", hint: "No review cycle scheduled" }

  const openMidYear = periods.find((p) => p.midYearStatus === "OPEN")
  if (openMidYear) return { label: openMidYear.name, hint: "Mid-Year cycle open" }

  const openAnnual = periods.find((p) => p.annualStatus === "OPEN")
  if (openAnnual) return { label: openAnnual.name, hint: "Annual cycle open" }

  const currentYear = new Date().getUTCFullYear()
  const thisYear = periods.find((p) => p.year === currentYear)
  if (thisYear) return { label: thisYear.name, hint: "No cycle open yet" }

  const mostRecent = [...periods].sort((a, b) => b.year - a.year)[0]
  return { label: mostRecent.name, hint: `${mostRecent.year} — no cycle open yet` }
}

export default async function StaffDashboardPage() {
  const session = await getSession()
  const employeeId = session?.employeeId ?? ""
  const currentYear = new Date().getUTCFullYear()

  const [balancesResult, pendingRequestsResult, reviewPeriodsResult, directReportsResult] = await Promise.all([
    fetchLeaveBalances(employeeId, currentYear),
    fetchLeaveRequests({ employeeId, status: "PENDING_APPROVAL" }),
    fetchReviewPeriods(),
    fetchDirectReports(employeeId),
  ])

  const annualBalance = balancesResult.ok
    ? balancesResult.data.filter((b) => b.leaveType.category === "ANNUAL").reduce((sum, b) => sum + b.remainingDays, 0)
    : null
  const pendingRequestsCount = pendingRequestsResult.ok ? pendingRequestsResult.data.length : null
  const nextReview = reviewPeriodsResult.ok ? pickNextReview(reviewPeriodsResult.data) : { label: "—", hint: "Couldn't load review periods" }
  const directReports = directReportsResult.ok ? directReportsResult.data : []
  const isLineManager = directReports.length > 0

  const stats = [
    {
      label: "Leave balance",
      value: annualBalance === null ? "—" : `${annualBalance} days`,
      hint: annualBalance === null ? "Couldn't load your leave balance" : `Annual leave remaining (${currentYear})`,
      icon: CalendarDays,
    },
    {
      label: "Next review",
      value: nextReview.label,
      hint: nextReview.hint,
      icon: Target,
    },
    {
      label: "Pending requests",
      value: pendingRequestsCount === null ? "—" : String(pendingRequestsCount),
      hint: "Your leave requests awaiting approval",
      icon: CheckCircle2,
    },
    {
      label: "My team",
      value: String(directReports.length),
      hint: isLineManager ? "Employees reporting to you" : "No one reports to you",
      icon: Users,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          A quick overview of your employment, leave, and performance status.
        </p>
      </div>

      <MandatoryTrainingBanner actingEmployeeId={session?.employeeId ?? ""} />

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

      {isLineManager ? (
        <Card>
          <CardHeader>
            <CardTitle>My team</CardTitle>
            <CardDescription>Employees who report to you, directly or via an assigned override.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {directReports.map((report) => (
              <div key={report.employeeNumber} className="rounded-lg border border-border p-3">
                <p className="font-medium text-foreground">
                  {report.firstName} {report.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{report.position?.title ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{report.branch?.name ?? "—"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
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
