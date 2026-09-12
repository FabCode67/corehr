"use client"

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { ChartTooltip } from "./chart-tooltip"

const COLORS = ["#0A2647", "#B8860B", "#2E7D6B", "#7F77DD", "#D85A30", "#5DCAA5", "#D4537E"]

const EMPTY_STATE = <p className="py-6 text-center text-sm text-muted-foreground">No data yet.</p>

/** Small donut — used for the two-or-few-category breakdowns (gender,
 *  contract type) where a pie reads faster than a bar at this size. */
export function BreakdownDonut({ data }: { data: { label: string; count: number }[] }) {
  const total = data.reduce((sum, row) => sum + row.count, 0)
  if (total === 0) return EMPTY_STATE

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={120} height={120}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="label" innerRadius={32} outerRadius={56} paddingAngle={2}>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1.5">
        {data.map((row, index) => (
          <div key={row.label} className="flex items-center gap-2 text-xs">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-semibold text-foreground">{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Horizontal bars for small named-category lists (leave by type, forms by
 *  status, rating distribution) — grows with the data instead of cramming
 *  labels into a fixed-width box, same treatment as the HR Analytics
 *  dashboard's DepartmentBarChart. */
export function BreakdownBars({ data, barLabel }: { data: { label: string; count: number }[]; barLabel: string }) {
  if (data.length === 0) return EMPTY_STATE
  const height = Math.max(140, data.length * 36)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={110} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="count" name={barLabel} fill="#0A2647" radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  )
}
