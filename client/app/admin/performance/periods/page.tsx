import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchReviewPeriods, type PerformanceCycleStatus } from "@/lib/api/performance"

import { PerformanceTabs } from "../performance-tabs"
import { CycleActions } from "./cycle-actions"
import { NewPeriodForm } from "./new-period-form"

const CYCLE_STATUS_VARIANT: Record<PerformanceCycleStatus, "outline" | "success" | "secondary"> = {
  DRAFT: "outline",
  OPEN: "success",
  CLOSED: "secondary",
}

export default async function ReviewPeriodsPage() {
  const result = await fetchReviewPeriods()
  const periods = result.ok ? result.data : []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Performance Management</h1>
        <p className="text-sm text-muted-foreground">
          Create review periods and open or close the Mid-Year and Annual cycles.
        </p>
      </div>

      <PerformanceTabs />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New review period</CardTitle>
          <CardDescription>e.g. &quot;FY2027&quot;, year 2027 — creates both cycles in Draft status.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewPeriodForm />
        </CardContent>
      </Card>

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : periods.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No review periods yet. Create the first one above.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {periods.map((period) => (
            <Card key={period.id}>
              <CardHeader>
                <CardTitle>{period.name}</CardTitle>
                <CardDescription>Performance year {period.year}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Mid-Year cycle</p>
                    <Badge variant={CYCLE_STATUS_VARIANT[period.midYearStatus]}>{period.midYearStatus}</Badge>
                  </div>
                  {period.midYearOpensAt ? (
                    <p className="text-xs text-muted-foreground">Opened {period.midYearOpensAt.slice(0, 10)}</p>
                  ) : null}
                  {period.midYearClosesAt ? (
                    <p className="text-xs text-muted-foreground">Closed {period.midYearClosesAt.slice(0, 10)}</p>
                  ) : null}
                  <CycleActions periodId={period.id} cycle="MID_YEAR" status={period.midYearStatus} />
                </div>

                <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Annual cycle</p>
                    <Badge variant={CYCLE_STATUS_VARIANT[period.annualStatus]}>{period.annualStatus}</Badge>
                  </div>
                  {period.annualOpensAt ? (
                    <p className="text-xs text-muted-foreground">Opened {period.annualOpensAt.slice(0, 10)}</p>
                  ) : null}
                  {period.annualClosesAt ? (
                    <p className="text-xs text-muted-foreground">Closed {period.annualClosesAt.slice(0, 10)}</p>
                  ) : null}
                  <CycleActions periodId={period.id} cycle="ANNUAL" status={period.annualStatus} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
