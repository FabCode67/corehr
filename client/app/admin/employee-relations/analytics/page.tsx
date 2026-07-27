import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  fetchCasesByBranch,
  fetchCasesByDepartment,
  fetchSanctionsByBand,
  fetchSanctionsByBranch,
  fetchSanctionsByDepartment,
  fetchSanctionsByFunction,
  fetchSanctionsByLevel,
  fetchSanctionsByType,
  fetchSanctionsByYear,
  fetchSanctionTrendByType,
  type OrgBucket,
} from "@/lib/api/employee-relations"
import { getSession } from "@/lib/get-session"

import { EmployeeRelationsTabs } from "../employee-relations-tabs"

function HorizontalBarList({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.value))

  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No data yet.</p>
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3 text-sm">
          <div className="w-40 shrink-0 truncate text-muted-foreground" title={row.label}>
            {row.label}
          </div>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }} />
          </div>
          <div className="w-10 shrink-0 text-right font-medium text-foreground">{row.value}</div>
        </div>
      ))}
    </div>
  )
}

function bucketRows(buckets: OrgBucket[]) {
  return buckets.map((bucket) => ({ label: bucket.name, value: bucket.count }))
}

export default async function EmployeeRelationsAnalyticsPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [
    casesByDepartmentResult,
    casesByBranchResult,
    sanctionsByTypeResult,
    sanctionsByYearResult,
    sanctionTrendByTypeResult,
    sanctionsByDepartmentResult,
    sanctionsByBranchResult,
    sanctionsByFunctionResult,
    sanctionsByLevelResult,
    sanctionsByBandResult,
  ] = await Promise.all([
    fetchCasesByDepartment(actingEmployeeId),
    fetchCasesByBranch(actingEmployeeId),
    fetchSanctionsByType(actingEmployeeId),
    fetchSanctionsByYear(actingEmployeeId),
    fetchSanctionTrendByType(actingEmployeeId),
    fetchSanctionsByDepartment(actingEmployeeId),
    fetchSanctionsByBranch(actingEmployeeId),
    fetchSanctionsByFunction(actingEmployeeId),
    fetchSanctionsByLevel(actingEmployeeId),
    fetchSanctionsByBand(actingEmployeeId),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Employee Relations</h1>
        <p className="text-sm text-muted-foreground">Deeper breakdowns by department, branch, function, level, and band.</p>
      </div>

      <EmployeeRelationsTabs />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cases by department</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList rows={casesByDepartmentResult.ok ? bucketRows(casesByDepartmentResult.data) : []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cases by branch</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList rows={casesByBranchResult.ok ? bucketRows(casesByBranchResult.data) : []} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sanctions by type</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList
              rows={sanctionsByTypeResult.ok ? sanctionsByTypeResult.data.map((row) => ({ label: row.name, value: row.count })) : []}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sanctions by year</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList rows={sanctionsByYearResult.ok ? sanctionsByYearResult.data.map((row) => ({ label: row.name, value: row.count })) : []} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sanctions by department</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList rows={sanctionsByDepartmentResult.ok ? bucketRows(sanctionsByDepartmentResult.data) : []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sanctions by branch</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList rows={sanctionsByBranchResult.ok ? bucketRows(sanctionsByBranchResult.data) : []} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Sanctions by function</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList rows={sanctionsByFunctionResult.ok ? bucketRows(sanctionsByFunctionResult.data) : []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sanctions by level</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList rows={sanctionsByLevelResult.ok ? bucketRows(sanctionsByLevelResult.data) : []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sanctions by band</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList rows={sanctionsByBandResult.ok ? bucketRows(sanctionsByBandResult.data) : []} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sanction trend by type</CardTitle>
          <CardDescription>Warning and termination trends — filter this table by sanction type name.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!sanctionTrendByTypeResult.ok || sanctionTrendByTypeResult.data.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Year</th>
                    <th className="px-4 py-3 font-medium">Sanction type</th>
                    <th className="px-4 py-3 font-medium">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sanctionTrendByTypeResult.data.map((row) => (
                    <tr key={`${row.year}-${row.sanctionTypeId}`}>
                      <td className="px-4 py-3 text-foreground">{row.year}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.sanctionTypeName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
