import Link from "next/link"
import { Briefcase, CalendarClock, ClipboardCheck, GraduationCap, Handshake, UserMinus, UserPlus, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchExecutiveDashboardOverview } from "@/lib/api/executive-dashboard"
import { fetchRequisitions } from "@/lib/api/recruitment"
import { fullName } from "@/lib/format-name"
import { getSession } from "@/lib/get-session"

import { MdApprovalButtons } from "./md-approval-buttons"

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

const DECIDED_VARIANT = { APPROVED: "success", FILLED: "success", REJECTED: "destructive", CLOSED: "outline" } as const

export default async function MdDashboardPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  if (!session?.isDirector) {
    return (
      <Card className="max-w-xl border-dashed">
        <CardHeader>
          <CardTitle className="text-base">MD dashboard</CardTitle>
          <CardDescription>This page is available to the Managing Director only.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const [overviewResult, pendingResult, allResult] = await Promise.all([
    fetchExecutiveDashboardOverview(actingEmployeeId),
    fetchRequisitions({ status: "PENDING_MD_APPROVAL" }, actingEmployeeId),
    fetchRequisitions({}, actingEmployeeId),
  ])
  const pending = pendingResult.ok ? pendingResult.data : []
  const decided = allResult.ok
    ? allResult.data.filter((r) => ["APPROVED", "REJECTED", "FILLED", "CLOSED"].includes(r.status)).slice(0, 6)
    : []
  const o = overviewResult.ok ? overviewResult.data : null
  const pipeline = o?.recruitment.pipeline ?? []
  const maxPipeline = Math.max(1, ...pipeline.map((p) => p.count))
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm text-muted-foreground">{today}</p>
        <h1 className="text-2xl font-semibold text-foreground">Managing Director Dashboard</h1>
        <p className="text-sm text-muted-foreground">Decisions waiting for you, and how the bank&apos;s workforce is moving.</p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="size-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Needs your decision</h2>
          {pending.length > 0 ? <Badge variant="destructive">{pending.length}</Badge> : null}
        </div>
        {pending.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up — no requisitions are waiting for approval.</CardContent>
          </Card>
        ) : (
          pending.map((r) => (
            <Card key={r.id} className="border-amber-500/40">
              <CardContent className="flex flex-col gap-4 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/staff/md/requisitions/${r.id}`} className="text-base font-semibold text-foreground hover:underline">
                      {r.position.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {r.department.name} · {r.numberOfVacancies} vacanc{r.numberOfVacancies === 1 ? "y" : "ies"} · {r.employmentType.replaceAll("_", " ")} · {r.hiringReason.replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested by {fullName(r.requestedBy)} · priority {r.priority}
                    </p>
                  </div>
                  <MdApprovalButtons requisitionId={r.id} actingEmployeeId={actingEmployeeId} />
                </div>
                {r.justification ? (
                  <div className="rounded-md bg-muted/40 p-3 text-sm">
                    <p className="text-xs font-medium text-muted-foreground">Justification</p>
                    <p className="text-foreground">{r.justification}</p>
                  </div>
                ) : null}
                {r.hrComment ? (
                  <div className="rounded-md bg-muted/40 p-3 text-sm">
                    <p className="text-xs font-medium text-muted-foreground">HR comment</p>
                    <p className="text-foreground">{r.hrComment}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {o ? (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">Workforce</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Kpi label="Active staff" value={o.employees.activeEmployees} hint={`${o.employees.totalEmployees} on record`} icon={Users} />
              <Kpi label="New joiners" value={o.employees.newJoinersLast30Days} hint={`${o.employees.newJoinersLast90Days} in 90 days`} icon={UserPlus} />
              <Kpi label="Exiting" value={o.employees.exitingEmployees} hint={`${o.employees.exitedEmployees} exited to date`} icon={UserMinus} />
              <Kpi label="On leave now" value={o.leave.employeesCurrentlyOnLeave} hint={`${o.employees.contractsExpiringNext90Days ?? 0} contracts expiring in 90 days`} icon={CalendarClock} />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">Recruitment</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Kpi label="Open requisitions" value={o.recruitment.openRequisitions} icon={Briefcase} />
              <Kpi label="Active applications" value={o.recruitment.activeApplications} icon={Users} />
              <Kpi label="Pending offers" value={o.recruitment.pendingOffers} icon={Handshake} />
              <Kpi label="Hires this month" value={o.recruitment.hiresThisMonth} hint={`${o.recruitment.interviewsThisWeek} interviews this week`} icon={UserPlus} />
            </div>
            {pipeline.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Candidate pipeline</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {pipeline.map((p) => (
                    <div key={p.status} className="flex items-center gap-3 text-sm">
                      <span className="w-28 shrink-0 text-muted-foreground">{p.status.replaceAll("_", " ")}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (p.count / maxPipeline) * 100)}%` }} />
                      </div>
                      <span className="w-8 text-right font-medium">{p.count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">People & compliance</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Kpi
                label="Mandatory training"
                value={o.learning.mandatoryTrainingCompliance === null ? "—" : `${o.learning.mandatoryTrainingCompliance}%`}
                hint={`${o.learning.overdueMandatoryTraining} overdue`}
                icon={GraduationCap}
              />
              <Kpi label="Open ER cases" value={o.employeeRelations.openCases} hint={`${o.employeeRelations.appealsPending} appeals pending`} icon={ClipboardCheck} />
            </div>
          </section>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Workforce figures are temporarily unavailable.</p>
      )}

      {decided.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">Recent requisition decisions</h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {decided.map((r) => (
                <Link key={r.id} href={`/staff/md/requisitions/${r.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30">
                  <span>
                    <span className="font-medium text-foreground">{r.position.title}</span>
                    <span className="text-muted-foreground"> · {r.department.name}</span>
                  </span>
                  <Badge variant={DECIDED_VARIANT[r.status as keyof typeof DECIDED_VARIANT] ?? "outline"}>{r.status.replaceAll("_", " ")}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  )
}
