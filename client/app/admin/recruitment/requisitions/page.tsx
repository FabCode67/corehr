import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchRequisitions, type RequisitionStatus } from "@/lib/api/recruitment"
import { getSession } from "@/lib/get-session"

import { RecruitmentTabs } from "../recruitment-tabs"

const STATUS_VARIANT: Record<RequisitionStatus, "outline" | "success" | "destructive"> = {
  DRAFT: "outline",
  PENDING_APPROVAL: "outline",
  APPROVED: "success",
  REJECTED: "destructive",
  CLOSED: "outline",
}

export default async function RequisitionsPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""
  const result = await fetchRequisitions({}, actingEmployeeId)
  const requisitions = result.ok ? result.data : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Recruitment Management</h1>
          <p className="text-sm text-muted-foreground">Job requisitions — the approved vacancies being recruited for.</p>
        </div>
        <Link href="/admin/recruitment/requisitions/new" className={buttonVariants({ size: "sm" })}>
          New requisition
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
      ) : requisitions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No requisitions yet.{" "}
            <Link href="/admin/recruitment/requisitions/new" className="text-primary underline">
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
                  <th className="px-4 py-3 font-medium">Position</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Vacancies</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requisitions.map((requisition) => (
                  <tr key={requisition.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{requisition.position.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{requisition.department.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{requisition.numberOfVacancies}</td>
                    <td className="px-4 py-3 text-muted-foreground">{requisition.priority}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[requisition.status]}>{requisition.status.replaceAll("_", " ")}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/recruitment/requisitions/${requisition.id}`}
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
