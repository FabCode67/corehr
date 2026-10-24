import Link from "next/link"
import { Briefcase, CalendarClock, GraduationCap, Star, UserMinus, Users } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { executiveDashboardPdfUrl } from "@/lib/api/export-urls"
import { fetchDepartmentScorecards, fetchExecutiveDashboardOverview, type DepartmentScorecardRow } from "@/lib/api/executive-dashboard"
import { getSession } from "@/lib/get-session"

import { ExportScorecardButton } from "./export-scorecard-button"

function Kpi({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint?: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  )
}

function Bar({ value, max, tone = "primary" }: { value: number; max: number; tone?: "primary" | "warn" | "bad" }) {
  const color = tone === "bad" ? "bg-destructive" : tone === "warn" ? "bg-amber-500" : "bg-primary"
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, Math.min(100, (value / Math.max(max, 1)) * 100))}%` }} />
    </div>
  )
}

const trainingTone = (p: number | null) => (p === null ? "primary" : p < 60 ? "bad" : p < 85 ? "warn" : "primary")

function AttentionList({ title, description, rows }: { title: string; description: string; rows: { name: string; detail: string }[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 text-sm">
        {rows.length === 0 ? <p className="text-muted-foreground">Nothing to flag.</p> : null}
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-2">
            <span className="truncate text-foreground">{r.name}</span>
            <Badge variant="outline">{r.detail}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default async function CooDashboardPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  if (!session?.isDeputyDirector && !session?.isDirector) {
    return (
      <Card className="max-w-xl border-dashed">
        <CardHeader>
          <CardTitle className="text-base">COO dashboard</CardTitle>
          <CardDescription>This page is available to the Deputy Director (COO) and the Managing Director.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const [overviewResult, scorecardResult] = await Promise.all([fetchExecutiveDashboardOverview(actingEmployeeId), fetchDepartmentScorecards()])
  const o = overviewResult.ok ? overviewResult.data : null
  const rows: DepartmentScorecardRow[] = scorecardResult.ok ? scorecardResult.data.rows : []
  const maxHead = Math.max(1, ...rows.map((r) => r.headcount))

  const rated = rows.filter((r) => r.averageRating !== null && r.ratedReviews > 0)
  const totalReviews = rated.reduce((s, r) => s + r.ratedReviews, 0)
  const overallRating = totalReviews > 0 ? rated.reduce((s, r) => s + (r.averageRating ?? 0) * r.ratedReviews, 0) / totalReviews : null
  const totalVacancies = rows.reduce((s, r) => s + r.openVacancies, 0)
  const totalExits = rows.reduce((s, r) => s + r.exitsLast12Months, 0)

  const lowTraining = [...rows].filter((r) => r.trainingCompliancePercent !== null).sort((a, b) => (a.trainingCompliancePercent ?? 0) - (b.trainingCompliancePercent ?? 0)).slice(0, 4)
  const lowRating = [...rated].sort((a, b) => (a.averageRating ?? 0) - (b.averageRating ?? 0)).slice(0, 4)
  const topExits = [...rows].filter((r) => r.exitsLast12Months > 0).sort((a, b) => b.exitsLast12Months - a.exitsLast12Months).slice(0, 4)
  const topVacancies = [...rows].filter((r) => r.openVacancies > 0).sort((a, b) => b.openVacancies - a.openVacancies).slice(0, 4)

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const dist = o?.performance.bellCurveDistribution ?? []
  const maxDist = Math.max(1, ...dist.map((d) => d.count))

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{today}</p>
          <h1 className="text-2xl font-semibold text-foreground">Chief Operating Officer Dashboard</h1>
          <p className="text-sm text-muted-foreground">How every department is performing — people, performance, training and hiring in one view.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportScorecardButton rows={rows} />
          <a href={executiveDashboardPdfUrl(actingEmployeeId)} className={buttonVariants({ size: "sm" })}>
            Executive summary (PDF)
          </a>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Active staff" value={o?.employees.activeEmployees ?? rows.reduce((s, r) => s + r.headcount, 0)} icon={Users} />
        <Kpi label="Avg performance" value={overallRating === null ? "—" : overallRating.toFixed(2)} hint={`${totalReviews} rated reviews`} icon={Star} />
        <Kpi label="Open vacancies" value={totalVacancies} hint={o ? `${o.recruitment.activeApplications} active applications` : undefined} icon={Briefcase} />
        <Kpi label="Mandatory training" value={o?.learning.mandatoryTrainingCompliance == null ? "—" : `${o.learning.mandatoryTrainingCompliance}%`} hint={o ? `${o.learning.overdueMandatoryTraining} overdue` : undefined} icon={GraduationCap} />
        <Kpi label="Exits (12 mo)" value={totalExits} hint={o ? `${o.employees.newJoinersLast90Days} joiners in 90 days` : undefined} icon={UserMinus} />
        <Kpi label="On leave now" value={o?.leave.employeesCurrentlyOnLeave ?? "—"} hint={o ? `${o.leave.leaveUtilizationDays} days used this year` : undefined} icon={CalendarClock} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">Needs attention</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AttentionList title="Lowest training compliance" description="Mandatory courses completed" rows={lowTraining.map((r) => ({ name: r.departmentName, detail: `${r.trainingCompliancePercent}%` }))} />
          <AttentionList title="Lowest performance" description="Average review rating" rows={lowRating.map((r) => ({ name: r.departmentName, detail: (r.averageRating ?? 0).toFixed(2) }))} />
          <AttentionList title="Most exits" description="Last 12 months" rows={topExits.map((r) => ({ name: r.departmentName, detail: `${r.exitsLast12Months}` }))} />
          <AttentionList title="Most open vacancies" description="Approved requisitions" rows={topVacancies.map((r) => ({ name: r.departmentName, detail: `${r.openVacancies}` }))} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Department scorecard</h2>
          <Link href="/staff/department-dashboard" className="text-xs font-medium text-primary hover:underline">
            Department dashboard →
          </Link>
        </div>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            {rows.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No department data yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium">Headcount</th>
                    <th className="px-4 py-3 font-medium">Vacancies</th>
                    <th className="px-4 py-3 font-medium">Avg rating</th>
                    <th className="px-4 py-3 font-medium">Training</th>
                    <th className="px-4 py-3 font-medium">Leave days</th>
                    <th className="px-4 py-3 font-medium">Exits (12 mo)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.departmentId} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{r.departmentName}</td>
                      <td className="w-40 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-8 text-right font-medium">{r.headcount}</span>
                          <Bar value={r.headcount} max={maxHead} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.openVacancies || "—"}</td>
                      <td className="px-4 py-3">{r.averageRating === null ? <span className="text-muted-foreground">—</span> : <span className="font-medium">{r.averageRating.toFixed(2)}</span>}</td>
                      <td className="w-40 px-4 py-3">
                        {r.trainingCompliancePercent === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="w-10 text-right">{r.trainingCompliancePercent}%</span>
                            <Bar value={r.trainingCompliancePercent} max={100} tone={trainingTone(r.trainingCompliancePercent)} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.leaveDaysYtd}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.exitsLast12Months || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </section>

      {o ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Performance rating distribution</CardTitle>
              <CardDescription>Share of employees by rating, bank-wide</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {dist.length === 0 ? <p className="text-sm text-muted-foreground">No finalized reviews yet.</p> : null}
              {dist.map((d) => (
                <div key={d.rank} className="flex items-center gap-3 text-sm">
                  <span className="w-32 shrink-0 truncate text-muted-foreground">{d.label}</span>
                  <Bar value={d.count} max={maxDist} />
                  <span className="w-16 text-right text-xs text-muted-foreground">
                    {d.count} · {d.actualPercentage}%
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top performers</CardTitle>
              <CardDescription>Highest-rated recent reviews</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {o.performance.topPerformers.length === 0 ? <p className="text-muted-foreground">No data yet.</p> : null}
              {o.performance.topPerformers.map((p) => (
                <div key={p.reviewId} className="flex items-center justify-between gap-2">
                  <span>
                    <span className="font-medium text-foreground">{p.employeeName}</span>
                    <span className="text-muted-foreground"> · {p.departmentName}</span>
                  </span>
                  <Badge variant="success">{p.rating}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Performance trend</CardTitle>
              <CardDescription>Average rating by year</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {o.performance.trends.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : null}
              {o.performance.trends.map((t) => (
                <div key={t.year} className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t.year}</p>
                  <p className="text-xl font-semibold text-foreground">{t.overallAverage.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    Mid-year {t.midYearAverage.toFixed(2)} · Annual {t.annualAverage.toFixed(2)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">Organization-wide figures are temporarily unavailable.</p>
      )}
    </div>
  )
}
