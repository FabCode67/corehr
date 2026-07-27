import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchWorkforcePlans, type WorkforcePlanStatus } from "@/lib/api/recruitment"
import { getSession } from "@/lib/get-session"

import { RecruitmentTabs } from "../recruitment-tabs"

const STATUS_VARIANT: Record<WorkforcePlanStatus, "outline" | "success" | "destructive"> = {
  DRAFT: "outline",
  PENDING_APPROVAL: "outline",
  APPROVED: "success",
  REJECTED: "destructive",
}

export default async function WorkforcePlansPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""
  const result = await fetchWorkforcePlans({}, actingEmployeeId)
  const plans = result.ok ? result.data : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Recruitment Management</h1>
          <p className="text-sm text-muted-foreground">Workforce plans — the starting point for every requisition.</p>
        </div>
        <Link href="/admin/recruitment/workforce-plans/new" className={buttonVariants({ size: "sm" })}>
          New workforce plan
        </Link>
      </div>

      <RecruitmentTabs />

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : plans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No workforce plans yet.{" "}
            <Link href="/admin/recruitment/workforce-plans/new" className="text-primary underline">
              Create the first one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Positions</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{plan.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{plan.department.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{plan.numberOfPositions}</td>
                    <td className="px-4 py-3 text-muted-foreground">{plan.priority}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[plan.status]}>{plan.status.replaceAll("_", " ")}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/recruitment/workforce-plans/${plan.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Manage
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
