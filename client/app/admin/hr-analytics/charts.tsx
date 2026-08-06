"use client"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const COLORS = ["#0A2647", "#B8860B", "#3B2412", "#2E7D6B", "#7F77DD", "#D85A30", "#5DCAA5", "#D4537E"]

export function BandDistributionChart({ data }: { data: { bandName: string; count: number }[] }) {
  if (data.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="bandName" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" fill="#0A2647" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Horizontal bars, one per department, sorted largest-first — replaces the
 *  old donut chart, which became unreadable once the bank had more than a
 *  handful of departments (thin slices, overlapping legend). Horizontal
 *  (not vertical) bars so department names read left-to-right instead of
 *  being rotated, and the chart's height grows with the number of
 *  departments rather than cramming them into a fixed box. */
export function DepartmentBarChart({ data }: { data: { departmentName: string; count: number }[] }) {
  if (data.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
  const sorted = [...data].sort((a, b) => b.count - a.count)
  const height = Math.max(240, sorted.length * 40)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey="departmentName" tick={{ fontSize: 11 }} width={160} />
        <Tooltip />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {sorted.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ExitTrendChart({ data }: { data: { year: number; exits: number }[] }) {
  if (data.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip />
        <Line type="monotone" dataKey="exits" stroke="#D85A30" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
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
  if (data.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
  const sorted = [...data].sort((a, b) => a.rank - b.rank)
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={sorted} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="expectedCurveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#B8860B" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#B8860B" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 11 }} unit="%" />
        <Tooltip />
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
        />
        <Area type="natural" dataKey="actualPercentage" name="Actual %" stroke="#0A2647" strokeWidth={2} fill="transparent" dot={{ r: 3 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function AgeHistogramChart({ data }: { data: { bucket: string; count: number }[] }) {
  if (data.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" fill="#2E7D6B" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** % of positions filled per department — dataKey is a plain percentage
 *  (0-100), same rounding as the KPI cards' fill-rate figure. Replaces the
 *  old "Positions by Department" chart (total headcount only, no sense of
 *  which departments actually have vacancies) per request. */
export function PositionFillRateChart({ data }: { data: { name: string; fillRate: number; filled: number; total: number }[] }) {
  if (data.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
        <Tooltip />
        <Bar dataKey="fillRate" name="Fill Rate %" fill="#7F77DD" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Hiring vs Exit trend — see HrAnalyticsService.hiringExitTrend()'s doc
 *  comment for why the year range is derived from the data rather than a
 *  fixed lookback window. */
export function HiringExitTrendChart({ data }: { data: { year: number; hires: number; exits: number }[] }) {
  if (data.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="hires" name="Hires" stroke="#5DCAA5" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="exits" name="Exits" stroke="#D85A30" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function RatingsByDepartmentChart({ data }: { data: { departmentName: string; averageRating: number }[] }) {
  if (data.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="departmentName" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 11 }} domain={[0, 5]} />
        <Tooltip />
        <Bar dataKey="averageRating" name="Avg. Rating" fill="#B8860B" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Rating standard deviation per department — how spread out performance
 *  is, not just its average (see PerformanceAnalyticsService.stdDev()'s doc
 *  comment). A tall bar means a wide gap between the department's best and
 *  worst-rated employees, even if the average looks fine. */
export function PerformanceVarianceByDepartmentChart({ data }: { data: { departmentName: string; ratingStdDev: number }[] }) {
  if (data.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="departmentName" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="ratingStdDev" name="Rating Std. Dev." fill="#D4537E" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
