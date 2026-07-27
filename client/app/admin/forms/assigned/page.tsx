import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchFormInstances, INSTANCE_STATUS_LABELS, type FormInstanceStatus } from "@/lib/api/forms"
import { getSession } from "@/lib/get-session"

import { FormsTabs } from "../forms-tabs"

const STATUS_VARIANT: Record<FormInstanceStatus, "outline" | "success" | "secondary" | "destructive" | "default"> = {
  DRAFT: "outline",
  ASSIGNED: "outline",
  IN_PROGRESS: "default",
  SUBMITTED: "default",
  PENDING_SIGNATURES: "default",
  REJECTED: "destructive",
  COMPLETED: "success",
  ARCHIVED: "secondary",
}

function isOverdue(dueDate: string | null, status: FormInstanceStatus) {
  if (!dueDate || status === "COMPLETED" || status === "REJECTED" || status === "ARCHIVED") return false
  return new Date(dueDate).getTime() < Date.now()
}

export default async function AssignedFormsPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""
  const result = await fetchFormInstances({}, actingEmployeeId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Forms Management</h1>
          <p className="text-sm text-muted-foreground">Every form instance assigned to an employee, across every status.</p>
        </div>
        <Link href="/admin/forms/assigned/new" className={buttonVariants({ size: "sm" })}>
          Assign a form
        </Link>
      </div>

      <FormsTabs />

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : result.data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No forms assigned yet.{" "}
            <Link href="/admin/forms/assigned/new" className="text-primary underline">
              Assign the first one
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
                  <th className="px-4 py-3 font-medium">Form</th>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Assigned by</th>
                  <th className="px-4 py-3 font-medium">Due date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.data.map((instance) => (
                  <tr key={instance.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{instance.formTemplate.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {instance.employee.firstName} {instance.employee.lastName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {instance.assignedBy.firstName} {instance.assignedBy.lastName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{instance.dueDate ? new Date(instance.dueDate).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={STATUS_VARIANT[instance.status]}>{INSTANCE_STATUS_LABELS[instance.status]}</Badge>
                        {isOverdue(instance.dueDate, instance.status) ? <Badge variant="destructive">Overdue</Badge> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/forms/instances/${instance.id}`} className="text-xs font-medium text-primary hover:underline">
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
