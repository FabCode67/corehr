import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchFormInstances, INSTANCE_STATUS_LABELS, type FormInstanceStatus } from "@/lib/api/forms"

const STATUS_VARIANT: Record<FormInstanceStatus, "outline" | "secondary" | "success" | "destructive"> = {
  DRAFT: "outline",
  ASSIGNED: "secondary",
  IN_PROGRESS: "secondary",
  SUBMITTED: "outline",
  PENDING_SIGNATURES: "outline",
  REJECTED: "destructive",
  COMPLETED: "success",
  ARCHIVED: "outline",
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

/**
 * Full-profile Forms section for the admin Employee Detail page — every form
 * instance assigned to this employee. FormsAccessService grants isAdmin
 * allowAll, so this always shows the complete list regardless of department.
 */
export async function FormsSection({ employeeId, actingEmployeeId }: { employeeId: string; actingEmployeeId: string }) {
  const result = await fetchFormInstances({ employeeId }, actingEmployeeId)

  if (!result.ok) {
    if (result.status === 403) return null
    return (
      <Card className="border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Forms</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (result.data.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Forms</CardTitle>
        <CardDescription>Forms assigned to this employee.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {result.data.map((instance) => (
          <div key={instance.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm">
            <span>
              {instance.formTemplate.title}
              {instance.dueDate ? ` · Due ${formatDate(instance.dueDate)}` : ""}
            </span>
            <Badge variant={STATUS_VARIANT[instance.status]}>{INSTANCE_STATUS_LABELS[instance.status]}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
