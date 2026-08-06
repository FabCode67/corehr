import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { ExecutiveDashboardOverview } from "@/lib/api/executive-dashboard"

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

function SectionHeader({
  title,
  description,
  href,
  linkLabel,
}: {
  title: string
  description: string
  href: string
  linkLabel: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
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

/**
 * Everything that used to live on the separate Executive Summary tab
 * (/admin/executive-dashboard, removed) plus one Overview-only number
 * (contracts expiring), folded into HR Analytics per "keep the content only
 * in HR Analytics." Deliberately skips stats already shown by KpiCards
 * above on the same page (Currently on Leave, Attrition Rate, Fill Rate,
 * Staff Headcount) — this section only adds what isn't covered elsewhere:
 * employee movement, recruitment pipeline detail, training compliance
 * percentages, top performers, leave carry-forward, and the three sections
 * (Employee Relations, Onboarding, Compliance) that had no home on this page
 * at all before.
 */
export function ExecutiveSummarySection({
  overview,
  pdfUrl,
  contractsExpiringCount,
  contractsExpiringWindowDays,
}: {
  overview: ExecutiveDashboardOverview
  pdfUrl: string
  contractsExpiringCount: number | null
  contractsExpiringWindowDays: number
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Executive Summary</h2>
          <p className="text-sm text-muted-foreground">
            Cross-module snapshot. Generated{" "}
            {new Date(overview.generatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}.
          </p>
        </div>
        <a href={pdfUrl}>
          <Button variant="outline" size="sm">
            Export Executive Summary PDF
          </Button>
        </a>
      </div>

      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Employee Movement"
          description="Joiners, exits, and contracts coming up for renewal."
          href="/admin/employees"
          linkLabel="View employees"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Exiting" value={overview.employees.exitingEmployees} />
          <StatCard label="Exited" value={overview.employees.exitedEmployees} />
          <StatCard label="New joiners (30d)" value={overview.employees.newJoinersLast30Days} />
          <StatCard label="New joiners (90d)" value={overview.employees.newJoinersLast90Days} />
          <StatCard
            label="Contracts expiring"
            value={contractsExpiringCount === null ? "—" : contractsExpiringCount}
            hint={`Next ${contractsExpiringWindowDays} days`}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Recruitment Pipeline"
          description="This week's interviews and near-term hiring activity."
          href="/admin/recruitment"
          linkLabel="View recruitment"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Interviews this week" value={overview.recruitment.interviewsThisWeek} />
          <StatCard label="Pending offers" value={overview.recruitment.pendingOffers} />
          <StatCard label="Hires this month" value={overview.recruitment.hiresThisMonth} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Training Compliance"
          description="Mandatory training compliance, bank-wide."
          href="/admin/learning"
          linkLabel="View learning"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Mandatory compliance" value={formatPercent(overview.learning.mandatoryTrainingCompliance)} />
          <StatCard label="Overdue mandatory training" value={overview.learning.overdueMandatoryTraining} />
          <StatCard
            label="AML compliance"
            value={
              overview.learning.amlCompliance.compliancePercent === null
                ? "Not tracked"
                : `${overview.learning.amlCompliance.compliancePercent}%`
            }
            hint={
              overview.learning.amlCompliance.compliancePercent === null
                ? "No course named “AML” found"
                : `${overview.learning.amlCompliance.completed}/${overview.learning.amlCompliance.totalAssigned} assignments`
            }
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Top Performers"
          description="Highest-rated reviews org-wide."
          href="/admin/performance"
          linkLabel="View performance"
        />
        <Card>
          <CardContent className="flex flex-col gap-2 pt-6">
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
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Leave Carry-Forward"
          description="Org-wide carry-forward balance, current year."
          href="/admin/leave"
          linkLabel="View leave"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Carry-forward balance (org-wide)" value={overview.leave.carryForwardBalanceTotal} />
        </div>
      </section>

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

      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Onboarding"
          description="Document completion across employees currently onboarding."
          href="/admin/onboarding-documents"
          linkLabel="View onboarding"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
          <StatCard
            label="Employees with outstanding documents"
            value={overview.onboarding.employeesWithOutstandingDocuments}
          />
          <StatCard label="Onboarding completion rate" value={formatPercent(overview.onboarding.onboardingCompletionRate)} />
        </div>
      </section>

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
            value={
              overview.compliance.expiredCertificationsTracked ? (overview.compliance.expiredCertifications ?? 0) : "Not tracked"
            }
            hint={overview.compliance.expiredCertificationsTracked ? undefined : "No certificate-expiry field exists in the schema yet"}
          />
          <StatCard label="Overdue mandatory training" value={overview.compliance.overdueMandatoryTraining} />
          <StatCard label="Outstanding employee documents" value={overview.compliance.outstandingEmployeeDocuments} />
        </div>
      </section>
    </div>
  )
}
