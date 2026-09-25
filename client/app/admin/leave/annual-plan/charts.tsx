"use client"

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { ChartTooltip } from "./chart-tooltip"

const COLORS = ["#0A2647", "#B8860B", "#3B2412", "#2E7D6B", "#7F77DD", "#D85A30", "#5DCAA5", "#D4537E"]

const EMPTY_STATE = <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>

/** Total planned leave days by department, for the year selected — a pie
 *  since departments are a small, fixed-ish set for a bank-wide summary
 *  view (see department-dashboard's BreakdownDonut, the one other place in
 *  this app that uses a pie instead of hr-analytics' horizontal-bar
 *  convention). */
export function PlannedLeaveByDepartmentPie({ data }: { data: { departmentName: string; plannedDays: number }[] }) {
  const total = data.reduce((sum, row) => sum + row.plannedDays, 0)
  if (total === 0) return EMPTY_STATE

  return (
    <div className="flex flex-wrap items-center gap-6">
      <ResponsiveContainer width={200} height={200}>
        <PieChart>
          <Pie data={data} dataKey="plannedDays" nameKey="departmentName" innerRadius={56} outerRadius={92} paddingAngle={2}>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1.5">
        {data.map((row, index) => (
          <div key={row.departmentName} className="flex items-center gap-2 text-xs">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span className="text-muted-foreground">{row.departmentName}</span>
            <span className="font-semibold text-foreground">{row.plannedDays}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Total planned leave days per calendar month, bank-wide (or department-
 *  filtered) — months are a fixed, ordered set, so a plain vertical column
 *  chart (not sorted/height-scaled like DepartmentBarChart) is the right
 *  shape here. */
export function PlannedLeaveByMonthBar({ data }: { data: { month: string; plannedDays: number }[] }) {
  const total = data.reduce((sum, row) => sum + row.plannedDays, 0)
  if (total === 0) return EMPTY_STATE

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="plannedDays" name="Planned days" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
