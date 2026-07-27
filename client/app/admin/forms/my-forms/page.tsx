import Link from "next/link"

import { Badge } from "@/components/ui/badge"
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

export default async function MyFormsPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""
  const result = await fetchFormInstances({ employeeId: actingEmployeeId }, actingEmployeeId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Forms Management</h1>
        <p className="text-sm text-muted-foreground">Forms assigned to you — open one to fill it in, save a draft, or submit it.</p>
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
          <CardContent className="py-10 text-center text-sm text-muted-foreground">You have no forms assigned right now.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {result.data.map((instance) => (
            <Link key={instance.id} href={`/admin/forms/instances/${instance.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/30">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{instance.formTemplate.title}</CardTitle>
                    <Badge variant={STATUS_VARIANT[instance.status]}>{INSTANCE_STATUS_LABELS[instance.status]}</Badge>
                  </div>
                  <CardDescription>{instance.formTemplate.category.name}</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  {instance.dueDate ? `Due ${new Date(instance.dueDate).toLocaleDateString()}` : "No due date"}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
