import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Briefcase, CalendarClock, Layers, TrendingUp, UserRound, Users } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type {
  AttritionBreakdownRow,
  AttritionRate,
  AverageAge,
  BandDistributionRow,
  LeaveUtilizationSummary,
  PositionFillRate,
  TotalStaff,
} from "@/lib/api/hr-analytics"

/**
 * Richer KPI card treatment: a colored accent strip + icon badge identify
 * each metric at a glance, a big headline number leads, then a small
 * data-dense visualization (segmented bar, mini bar list, or stat rows)
 * and — where a threshold judgment genuinely helps HR triage something —
 * a status pill. Colors reuse the app's existing brand + "extended chart
 * palette" accents (see globals.css / HR Analytics charts elsewhere in this
 * module) rather than introducing new hues, so this stays visually
 * consistent with the rest of the light-themed admin portal.
 */

const ACCENTS = {
  gold: { bar: "bg-[#B8860B]", text: "text-[#B8860B]", bg: "bg-[#B8860B]/10" },
  purple: { bar: "bg-[#7F77DD]", text: "text-[#7F77DD]", bg: "bg-[#7F77DD]/10" },
  mint: { bar: "bg-[#5DCAA5]", text: "text-[#5DCAA5]", bg: "bg-[#5DCAA5]/10" },
  pink: { bar: "bg-[#D4537E]", text: "text-[#D4537E]", bg: "bg-[#D4537E]/10" },
  orange: { bar: "bg-[#D85A30]", text: "text-[#D85A30]", bg: "bg-[#D85A30]/10" },
  navy: { bar: "bg-primary", text: "text-primary", bg: "bg-primary/10" },
} as const

type Accent = keyof typeof ACCENTS

function KpiShell({
  accent,
  icon: Icon,
  label,
  value,
  subtitle,
  caveat,
  children,
  pill,
}: {
  accent: Accent
  icon: LucideIcon
  label: string
  value: string
  subtitle?: string
  caveat?: string
  children?: ReactNode
  pill?: { tone: "good" | "warn" | "bad"; text: string }
}) {
  const tones = ACCENTS[accent]
  const pillClasses = pill
    ? {
        good: "bg-[#5DCAA5]/15 text-[#3d8f70]",
        warn: "bg-[#B8860B]/15 text-[#8a6508]",
        bad: "bg-[#D4537E]/15 text-[#b13a5c]",
      }[pill.tone]
    : ""

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className={`h-1 w-full ${tones.bar}`} />
      <CardContent className="flex flex-col gap-3 pt-4 pb-4">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
          <div className={`flex size-7 shrink-0 items-center justify-center rounded-full ${tones.bg}`}>
            <Icon className={`size-3.5 ${tones.text}`} />
          </div>
        </div>

        <div>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
          {caveat ? <p className="text-[11px] text-muted-foreground/70 italic">{caveat}</p> : null}
        </div>

        {children}

        {pill ? (
          <div className={`rounded-md px-2.5 py-1.5 text-center text-xs font-medium ${pillClasses}`}>{pill.text}</div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function SegmentedBar({ segments }: { segments: { value: number; className: string }[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
      {segments.map((s, i) => (
        <div key={i} className={s.className} style={{ width: `${total === 0 ? 0 : (s.value / total) * 100}%` }} />
      ))}
    </div>
  )
}

function attritionPill(rate: number): { tone: "good" | "warn" | "bad"; text: string } {
  if (rate >= 15) return { tone: "bad", text: "● High — review urgently" }
  if (rate >= 8) return { tone: "warn", text: "● Moderate — monitor" }
  return { tone: "good", text: "✓ Healthy attrition" }
}

function fillRatePill(fillRate: number): { tone: "good" | "warn" | "bad"; text: string } {
  if (fillRate < 50) return { tone: "bad", text: "● Critical vacancies" }
  if (fillRate < 75) return { tone: "warn", text: "● Some vacancies — plan hiring" }
  return { tone: "good", text: "✓ Well staffed" }
}

function leaveUtilizationPill(percent: number): { tone: "good" | "warn" | "bad"; text: string } {
  if (percent >= 80) return { tone: "bad", text: "● High usage — check coverage" }
  if (percent < 40) return { tone: "warn", text: "● Low usage — encourage leave" }
  return { tone: "good", text: "✓ Healthy utilization" }
}

export function KpiCards({
  totalStaff,
  averageAge,
  ageHistogram,
  genderDistribution,
  bandDistribution,
  attritionRate,
  voluntaryExits,
  positionFillRate,
  leaveUtilization,
}: {
  totalStaff: TotalStaff
  averageAge: AverageAge
  ageHistogram: { bucket: string; count: number }[]
  genderDistribution: AttritionBreakdownRow[]
  bandDistribution: BandDistributionRow[]
  attritionRate: AttritionRate
  voluntaryExits: number
  positionFillRate: PositionFillRate
  leaveUtilization: LeaveUtilizationSummary
}) {
  const notActive = totalStaff.exited
  const totalHeadcount = totalStaff.activeCount + notActive
  const male = genderDistribution.find((g) => g.key === "MALE")?.count ?? 0
  const female = genderDistribution.find((g) => g.key === "FEMALE")?.count ?? 0

  const bandTotal = bandDistribution.reduce((sum, b) => sum + b.count, 0)
  const topBands = [...bandDistribution].sort((a, b) => b.count - a.count).slice(0, 4)

  const retainedPercent = Math.max(0, Math.round((100 - attritionRate.rate) * 10) / 10)
  const vacant = positionFillRate.total - positionFillRate.filled

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiShell
        accent="gold"
        icon={Users}
        label="Staff Headcount"
        value={totalHeadcount.toLocaleString()}
        subtitle={`${totalStaff.activeCount} active · ${notActive} not active`}
        caveat="Not active = employmentStatus field, independent of formal Exit records"
      >
        <div className="flex flex-col gap-1.5">
          <SegmentedBar
            segments={[
              { value: male, className: "bg-primary" },
              { value: female, className: "bg-[#D4537E]" },
            ]}
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>♂ {male} male</span>
            <span>♀ {female} female</span>
          </div>
        </div>
      </KpiShell>

      <KpiShell
        accent="purple"
        icon={UserRound}
        label="Average Age"
        value={averageAge.overall !== null ? `${averageAge.overall} yrs` : "—"}
        subtitle={`Across ${averageAge.byDepartment.length} department${averageAge.byDepartment.length === 1 ? "" : "s"}`}
      >
        <div className="grid grid-cols-4 gap-1 text-center">
          {ageHistogram.map((bucket) => (
            <div key={bucket.bucket} className="flex flex-col gap-1">
              <div className="h-1 rounded-full bg-[#7F77DD]" />
              <p className="text-sm font-semibold text-foreground">{bucket.count}</p>
              <p className="text-[10px] text-muted-foreground">{bucket.bucket}</p>
            </div>
          ))}
        </div>
      </KpiShell>

      <KpiShell
        accent="mint"
        icon={Layers}
        label="Band Distribution"
        value={bandTotal.toLocaleString()}
        subtitle="Employees with a band assigned"
      >
        <div className="flex flex-col gap-1.5">
          {topBands.map((band) => (
            <div key={band.bandId} className="flex items-center gap-2">
              <span className="w-16 shrink-0 truncate text-[11px] text-muted-foreground">{band.bandName}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-[#5DCAA5]" style={{ width: `${band.percent}%` }} />
              </div>
              <span className="w-8 shrink-0 text-right text-[11px] text-muted-foreground">{band.percent}%</span>
            </div>
          ))}
        </div>
      </KpiShell>

      <KpiShell
        accent="pink"
        icon={TrendingUp}
        label="Attrition Rate"
        value={`${attritionRate.rate}%`}
        subtitle={`${attritionRate.exits} exits · ${retainedPercent}% retained`}
        pill={attritionPill(attritionRate.rate)}
      >
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-[11px] text-muted-foreground">Voluntary exits</p>
            <p className="font-medium text-foreground">{voluntaryExits}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">YoY change</p>
            <p className={`font-medium ${attritionRate.changePercent > 0 ? "text-[#D4537E]" : "text-foreground"}`}>
              {attritionRate.changePercent > 0 ? "+" : ""}
              {attritionRate.changePercent}%
            </p>
          </div>
        </div>
      </KpiShell>

      <KpiShell
        accent="orange"
        icon={Briefcase}
        label="Fill Rate"
        value={`${positionFillRate.fillRate}%`}
        subtitle={`${positionFillRate.filled} of ${positionFillRate.total} positions filled`}
        caveat="Current org structure — not affected by the date filter"
        pill={fillRatePill(positionFillRate.fillRate)}
      >
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-[#D85A30]" style={{ width: `${positionFillRate.fillRate}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{positionFillRate.filled} filled</span>
            <span>{vacant} vacant</span>
          </div>
        </div>
      </KpiShell>

      <KpiShell
        accent="navy"
        icon={CalendarClock}
        label="Leave Utilization"
        value={`${leaveUtilization.utilizationPercent}%`}
        subtitle={`${leaveUtilization.totalTaken} of ${leaveUtilization.totalEntitlement} days used`}
        pill={leaveUtilizationPill(leaveUtilization.utilizationPercent)}
      >
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${leaveUtilization.utilizationPercent}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            On leave now: <span className="font-medium text-foreground">{leaveUtilization.currentlyOnLeaveCount}</span> employee
            {leaveUtilization.currentlyOnLeaveCount === 1 ? "" : "s"}
          </p>
        </div>
      </KpiShell>
    </div>
  )
}
