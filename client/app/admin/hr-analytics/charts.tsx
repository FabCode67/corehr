"use client"

import type { ReactNode } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { ChartTooltip } from "./chart-tooltip"

const COLORS = ["#0A2647", "#B8860B", "#3B2412", "#2E7D6B", "#7F77DD", "#D85A30", "#5DCAA5", "#D4537E"]

const EMPTY_STATE = <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>

/** Green/amber/red thresholds shared with the Fill Rate KPI card's pill, so
 *  a department's bar color always agrees with what the top-card status
 *  copy would say about it. */
function fillRateColor(rate: number) {
  if (rate < 50) return "#D4537E"
  if (rate < 75) return "#B8860B"
  return "#5DCAA5"
}

/**
 * Horizontal-scroll wrapper for the year-trend charts — instead of
 * compressing every year into a fixed-width box (labels overlap once a bank
 * has 8-10+ years on record), the chart's own width grows with the number
 * of data points and the card scrolls horizontally. `minWidthPerPoint`
 * lets dual-series charts (Hiring vs Exit) reserve more room per year than
 * single-series ones.
 */
function ScrollableChart({
  pointCount,
  minWidthPerPoint,
  minWidth = 480,
  height,
  children,
}: {
  pointCount: number
  minWidthPerPoint: number
  minWidth?: number
  height: number
  children: ReactNode
}) {
  const width = Math.max(minWidth, pointCount * minWidthPerPoint)
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: width, height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as never}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function BandDistributionChart({ data }: { data: { bandName: string; count: number }[] }) {
  if (data.length === 0) return EMPTY_STATE
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0A2647" stopOpacity={1} />
            <stop offset="100%" stopColor="#0A2647" stopOpacity={0.65} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="bandName" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="count" name="Employees" fill="url(#bandFill)" radius={[4, 4, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Horizontal bars, one per department, sorted largest-first — replaces the
 *  old donut chart, which became unreadable once the bank had more than a
 *  handful of departments (thin slices, overlapping legend). Horizontal
 *  (not vertical) bars so department names read left-to-right instead of
 *  being rotated, and the chart's height grows with the number of
 *  departments rather than cramming them into a fixed box — the same
 *  "grows with the data" treatment used below for Fill Rate, Ratings, and
 *  Variance by department. */
export function DepartmentBarChart({ data }: { data: { departmentName: string; count: number }[] }) {
  if (data.length === 0) return EMPTY_STATE
  const sorted = [...data].sort((a, b) => b.count - a.count)
  const height = Math.max(240, sorted.length * 40)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey="departmentName" tick={{ fontSize: 11 }} width={168} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="count" name="Employees" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {sorted.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Area-under-line treatment (not a bare line) reads more clearly once a
 *  bank has many years on record — the filled area keeps the eye anchored
 *  to the trend even when points are far apart on a wide, scrollable
 *  chart. */
export function ExitTrendChart({ data }: { data: { year: number; exits: number }[] }) {
  if (data.length === 0) return EMPTY_STATE
  return (
    <ScrollableChart pointCount={data.length} minWidthPerPoint={70} height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="exitTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D85A30" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#D85A30" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="exits"
          name="Exits"
          stroke="#D85A30"
          strokeWidth={2}
          fill="url(#exitTrendFill)"
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ScrollableChart>
  )
}

/**
 * A real bell curve, not grouped bars: ranks are sorted ascending (1
 * Unsatisfactory → 5 Outstanding) so the shape reads left-to-right, and both
 * series use smooth ("natural") curve interpolation. Expected % is the
 * HR-configured reference curve — seeded as the classic 10/20/40/20/10
 * forced curve (see prisma/seed.ts), so it peaks at rank 3 (Succeeded) by
 * design, exactly like a normal distribution. Actual % is the real
 * distribution, drawn as a plain line on top so you can see at a glance
 * whether the org's real ratings are skewing away from that calibration.
 */
export function PerformanceBellCurveChart({
  data,
}: {
  data: { rank: number; label: string; actualPercentage: number; expectedPercentage: number | null }[]
}) {
  if (data.length === 0) return EMPTY_STATE
  const sorted = [...data].sort((a, b) => a.rank - b.rank)
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={sorted} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="expectedCurveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#B8860B" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#B8860B" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="actualCurveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0A2647" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#0A2647" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 11 }} unit="%" width={40} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area
          type="natural"
          dataKey="expectedPercentage"
          name="Expected % (bell curve)"
          stroke="#B8860B"
          strokeWidth={2}
          fill="url(#expectedCurveFill)"
          connectNulls
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Area
          type="natural"
          dataKey="actualPercentage"
          name="Actual %"
          stroke="#0A2647"
          strokeWidth={2}
          fill="url(#actualCurveFill)"
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function AgeHistogramChart({ data }: { data: { bucket: string; count: number }[] }) {
  if (data.length === 0) return EMPTY_STATE
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="ageFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2E7D6B" stopOpacity={1} />
            <stop offset="100%" stopColor="#2E7D6B" stopOpacity={0.65} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="count" name="Employees" fill="url(#ageFill)" radius={[4, 4, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** % of positions filled per department — sorted worst-first (lowest fill
 *  rate on top) so the departments that most need hiring attention are the
 *  first thing you see, and colored red/amber/green against the same
 *  thresholds as the Fill Rate KPI card's status pill. Horizontal bars with
 *  a height that grows per department, same as DepartmentBarChart, so a
 *  bank with 20+ departments doesn't compress into unreadable rotated
 *  labels. Replaces the old "Positions by Department" chart (total
 *  headcount only, no sense of which departments actually have vacancies)
 *  per request. */
export function PositionFillRateChart({ data }: { data: { name: string; fillRate: number; filled: number; total: number }[] }) {
  if (data.length === 0) return EMPTY_STATE
  const sorted = [...data].sort((a, b) => a.fillRate - b.fillRate)
  const height = Math.max(240, sorted.length * 40)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={168} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="fillRate" name="Fill Rate" unit="%" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {sorted.map((entry, index) => (
            <Cell key={index} fill={fillRateColor(entry.fillRate)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Hiring vs Exit trend — see HrAnalyticsService.hiringExitTrend()'s doc
 *  comment for why the year range is derived from the data rather than a
 *  fixed lookback window. Horizontally scrollable so many years of history
 *  stay readable instead of compressing every point into a fixed box. */
export function HiringExitTrendChart({ data }: { data: { year: number; hires: number; exits: number }[] }) {
  if (data.length === 0) return EMPTY_STATE
  return (
    <ScrollableChart pointCount={data.length} minWidthPerPoint={90} minWidth={520} height={340}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="hiresFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#5DCAA5" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#5DCAA5" stopOpacity={0.03} />
          </linearGradient>
          <linearGradient id="exitsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D85A30" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#D85A30" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="hires" name="Hires" stroke="#5DCAA5" strokeWidth={2} fill="url(#hiresFill)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Area type="monotone" dataKey="exits" name="Exits" stroke="#D85A30" strokeWidth={2} fill="url(#exitsFill)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ScrollableChart>
  )
}

/** Horizontal bars, best-first, height grows per department — same pattern
 *  as DepartmentBarChart / PositionFillRateChart so this scales cleanly
 *  past a handful of departments instead of rotating cramped labels. */
export function RatingsByDepartmentChart({ data }: { data: { departmentName: string; averageRating: number }[] }) {
  if (data.length === 0) return EMPTY_STATE
  const sorted = [...data].sort((a, b) => b.averageRating - a.averageRating)
  const height = Math.max(240, sorted.length * 40)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 5]} />
        <YAxis type="category" dataKey="departmentName" tick={{ fontSize: 11 }} width={168} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="averageRating" name="Avg. Rating" fill="#B8860B" radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Rating standard deviation per department — how spread out performance
 *  is, not just its average (see PerformanceAnalyticsService.stdDev()'s doc
 *  comment). A tall bar means a wide gap between the department's best and
 *  worst-rated employees, even if the average looks fine. Sorted
 *  worst-first (highest variance on top) — same "surface the problem
 *  first" ordering as Fill Rate above — and horizontal with a height that
 *  grows per department. */
export function PerformanceVarianceByDepartmentChart({ data }: { data: { departmentName: string; ratingStdDev: number }[] }) {
  if (data.length === 0) return EMPTY_STATE
  const sorted = [...data].sort((a, b) => b.ratingStdDev - a.ratingStdDev)
  const height = Math.max(240, sorted.length * 40)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="departmentName" tick={{ fontSize: 11 }} width={168} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="ratingStdDev" name="Rating Std. Dev." fill="#D4537E" radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  )
}
