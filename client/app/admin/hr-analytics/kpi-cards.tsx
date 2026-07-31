import { Card, CardContent } from "@/components/ui/card"
import type { AttritionRate, AverageAge, LeaveUtilizationSummary, PositionFillRate, TotalStaff } from "@/lib/api/hr-analytics"

function ChangeBadge({ value, invertGood }: { value: number | null; invertGood?: boolean }) {
  if (value === null || value === 0) return null
  const isGood = invertGood ? value < 0 : value > 0
  return (
    <span className={`text-xs font-medium ${isGood ? "text-emerald-600" : "text-destructive"}`}>
      {value > 0 ? "↑" : "↓"} {Math.abs(value)}% vs last year
    </span>
  )
}

export function KpiCards({
  totalStaff,
  averageAge,
  attritionRate,
  positionFillRate,
  leaveUtilization,
}: {
  totalStaff: TotalStaff
  averageAge: AverageAge
  attritionRate: AttritionRate
  positionFillRate: PositionFillRate
  leaveUtilization: LeaveUtilizationSummary
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Card>
        <CardContent className="flex flex-col gap-1 pt-6">
          <p className="text-xs text-muted-foreground">Total Staff</p>
          <p className="text-2xl font-semibold text-foreground">{totalStaff.activeCount.toLocaleString()} Employees</p>
          <p className="text-xs text-muted-foreground">
            +{totalStaff.newJoined} joined · −{totalStaff.exited} exited
          </p>
          <ChangeBadge value={totalStaff.changePercent} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1 pt-6">
          <p className="text-xs text-muted-foreground">Average Employee Age</p>
          <p className="text-2xl font-semibold text-foreground">{averageAge.overall ?? "—"} {averageAge.overall !== null ? "Years" : ""}</p>
          <p className="text-xs text-muted-foreground">Across {averageAge.byDepartment.length} department{averageAge.byDepartment.length === 1 ? "" : "s"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1 pt-6">
          <p className="text-xs text-muted-foreground">Attrition Rate</p>
          <p className="text-2xl font-semibold text-foreground">{attritionRate.rate}%</p>
          <ChangeBadge value={attritionRate.changePercent} invertGood />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1 pt-6">
          <p className="text-xs text-muted-foreground">Position Fill Rate</p>
          <p className="text-2xl font-semibold text-foreground">{positionFillRate.fillRate}%</p>
          <p className="text-xs text-muted-foreground">
            {positionFillRate.filled} Filled / {positionFillRate.total} Total Positions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1 pt-6">
          <p className="text-xs text-muted-foreground">Leave Utilization</p>
          <p className="text-2xl font-semibold text-foreground">{leaveUtilization.utilizationPercent}%</p>
          <p className="text-xs text-muted-foreground">Annual Leave Used ({leaveUtilization.totalTaken}/{leaveUtilization.totalEntitlement} days)</p>
        </CardContent>
      </Card>
    </div>
  )
}
