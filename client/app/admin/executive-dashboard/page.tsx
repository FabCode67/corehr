import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchExecutiveDashboardOverview, executiveDashboardPdfUrl } from "@/lib/api/executive-dashboard"
import { getSession } from "@/lib/get-session"

import { DashboardTabs } from "../dashboard-tabs"

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}

function SectionHeader({ title, description, href, linkLabel }: { title: string; description: string; href: string; linkLabel: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Link href={href} className="text-xs font-medium text-primary hover:underline">
        {linkLabel} →
      </Link>
    </div>
  )
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value}%`
}

export default async function ExecutiveDashboardPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""
  const result = await fetchExecutiveDashboardOverview(actingEmployeeId)

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">Executive Dashboard</h1>
        <DashboardTabs />
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const overview = result.data

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            A combined, real-time view across Employees, Recruitment, Learning, Performance, Leave, Employee
            Relations, Onboarding, and Compliance. Generated {new Date(overview.generatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}.
          </p>
        </div>
        <a href={executiveDashboardPdfUrl(actingEmployeeId)}>
          <Button variant="outline" size="sm">
            Export PDF
          </Button>
        </a>
      </div>

      <DashboardTabs />

      {/* Employee overview */}
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Employee Overview"
          description="Headcount and movement across the organisation."
          href="/admin/employees"
          linkLabel="View employees"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total employees" value={overview.employees.totalEmployees} />
          <StatCard label="Active" value={overview.employees.activeEmployees} />
          <StatCard label="Exiting" value={overview.employees.exitingEmployees} />
          <StatCard label="Exited" value={overview.employees.exitedEmployees} />
          <StatCard label="New joiners (30d)" value={overview.employees.newJoinersLast30Days} />
          <StatCard label="New joiners (90d)" value={overview.employees.newJoinersLast90Days} />
        </div>
      </section>

      {/* Recruitment */}
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Recruitment"
          description="Pipeline health for the current hiring cycle."
          href="/admin/recruitment"
          linkLabel="View recruitment"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Open requisitions" value={overview.recruitment.openRequisitions} />
          <StatCard label="Active applications" value={overview.recruitment.activeApplications} />
          <StatCard label="Interviews this week" value={overview.recruitment.interviewsThisWeek} />
          <StatCard label="Pending offers" value={overview.recruitment.pendingOffers} />
          <StatCard label="Hires this month" value={overview.recruitment.hiresThisMonth} />
        </div>
      </section>

      {/* Learning & Development */}
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Learning & Development"
          description="Mandatory training compliance and course completion."
          href="/admin/learning"
          linkLabel="View learning"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Course completion rate" value={formatPercent(overview.learning.courseCompletionRate)} />
          <StatCard label="Mandatory compliance" value={formatPercent(overview.learning.mandatoryTrainingCompliance)} />
          <StatCard label="Overdue mandatory training" value={overview.learning.overdueMandatoryTraining} />
          <StatCard
            label="AML compliance"
            value={overview.learning.amlCompliance.compliancePercent === null ? "Not tracked" : `${overview.learning.amlCompliance.compliancePercent}%`}
            hint={
              overview.learning.amlCompliance.compliancePercent === null
                ? "No course named “AML” found"
                : `${overview.learning.amlCompliance.completed}/${overview.learning.amlCompliance.totalAssigned} assignments`
            }
          />
        </div>
      </section>

      {/* Performance */}
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Performance"
          description="Bell curve distribution and top performers."
          href="/admin/performance"
          linkLabel="View performance"
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rating distribution</CardTitle>
              <CardDescription>Actual vs. expected, all reviews.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {overview.performance.bellCurveDistribution.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews finalized yet.</p>
              ) : (
                overview.performance.bellCurveDistribution.map((entry) => (
                  <div key={entry.rank} className="flex items-center gap-3 text-sm">
                    <div className="w-28 shrink-0 truncate text-muted-foreground">{entry.label}</div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, entry.actualPercentage)}%` }} />
                    </div>
                    <div className="w-28 shrink-0 text-right text-xs text-muted-foreground">
                      {entry.actualPercentage}%{entry.expectedPercentage !== null ? ` (exp. ${entry.expectedPercentage}%)` : ""}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top performers</CardTitle>
              <CardDescription>Highest-rated reviews org-wide.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {overview.performance.topPerformers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews finalized yet.</p>
              ) : (
                overview.performance.topPerformers.map((entry) => (
                  <div key={entry.reviewId} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-foreground">{entry.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{entry.departmentName}</p>
                    </div>
                    <Badge variant="success">{entry.rating.toFixed(1)}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Leave */}
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Leave Management"
          description="Utilization and carry-forward balances, current year."
          href="/admin/leave"
          linkLabel="View leave"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Currently on leave" value={overview.leave.employeesCurrentlyOnLeave} />
          <StatCard label="Leave days taken (YTD)" value={overview.leave.leaveUtilizationDays} />
          <StatCard label="Carry-forward balance (org-wide)" value={overview.leave.carryForwardBalanceTotal} />
        </div>
      </section>

      {/* Employee Relations */}
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Employee Relations"
          description="Disciplinary cases and appeals."
          href="/admin/employee-relations"
          linkLabel="View employee relations"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Active cases" value={overview.employeeRelations.activeDisciplinaryCases} />
          <StatCard label="Total cases" value={overview.employeeRelations.totalCases} />
          <StatCard label="Under investigation" value={overview.employeeRelations.underInvestigation} />
          <StatCard label="Appeals pending" value={overview.employeeRelations.appealsPending} />
        </div>
      </section>

      {/* Onboarding */}
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Onboarding"
          description="Document completion across employees currently onboarding."
          href="/admin/onboarding-documents"
          linkLabel="View onboarding"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
          <StatCard label="Employees with outstanding documents" value={overview.onboarding.employeesWithOutstandingDocuments} />
          <StatCard label="Onboarding completion rate" value={formatPercent(overview.onboarding.onboardingCompletionRate)} />
        </div>
      </section>

      {/* Compliance */}
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Compliance"
          description="Cross-cutting compliance signals."
          href="/admin/learning"
          linkLabel="View training"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard
            label="Expired certifications"
            value={overview.compliance.expiredCertificationsTracked ? (overview.compliance.expiredCertifications ?? 0) : "Not tracked"}
            hint={overview.compliance.expiredCertificationsTracked ? undefined : "No certificate-expiry field exists in the schema yet"}
          />
          <StatCard label="Overdue mandatory training" value={overview.compliance.overdueMandatoryTraining} />
          <StatCard label="Outstanding employee documents" value={overview.compliance.outstandingEmployeeDocuments} />
        </div>
      </section>
    </div>
  )
}
