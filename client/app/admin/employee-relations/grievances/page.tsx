import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { fetchGrievances, formatErEnum, GRIEVANCE_STATUS_LABELS, type GrievanceStatus } from "@/lib/api/employee-relations"
import { getSession } from "@/lib/get-session"

import { EmployeeRelationsTabs } from "../employee-relations-tabs"

const STATUS_VARIANT: Record<GrievanceStatus, "outline" | "success" | "secondary" | "destructive" | "default"> = {
  SUBMITTED: "outline",
  UNDER_REVIEW: "default",
  RESOLVED: "success",
  CLOSED: "secondary",
}

interface SearchParams {
  [key: string]: string | undefined
  status?: string
}

export default async function GrievancesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = await searchParams
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const result = await fetchGrievances({ status: filters.status as GrievanceStatus | undefined }, actingEmployeeId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Employee Relations</h1>
        <p className="text-sm text-muted-foreground">Grievances submitted by employees — visible to HR and the submitter only.</p>
      </div>

      <EmployeeRelationsTabs />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select name="status" defaultValue={filters.status ?? ""} className="w-48">
                <option value="">Any status</option>
                {Object.entries(GRIEVANCE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <button type="submit" className={buttonVariants({ size: "sm", variant: "outline" })}>
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : result.data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">No grievances match these filters.</CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Grievance #</th>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Assigned to</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.data.map((grievance) => (
                  <tr key={grievance.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{grievance.grievanceNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {grievance.employee.firstName} {grievance.employee.lastName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatErEnum(grievance.category)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(grievance.dateSubmitted).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{grievance.assignedTo ? `${grievance.assignedTo.firstName} ${grievance.assignedTo.lastName}` : "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[grievance.status]}>{GRIEVANCE_STATUS_LABELS[grievance.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/employee-relations/grievances/${grievance.id}`} className="text-xs font-medium text-primary hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
