import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchFormInstances, fetchPendingSignatures, INSTANCE_STATUS_LABELS, SIGNER_ROLE_LABELS, type FormInstanceStatus } from "@/lib/api/forms"
import { getSession } from "@/lib/get-session"

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

export default async function StaffFormsPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [myFormsResult, pendingSignaturesResult] = await Promise.all([
    fetchFormInstances({ employeeId: actingEmployeeId }, actingEmployeeId),
    fetchPendingSignatures(actingEmployeeId),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Forms & Requests</h1>
        <p className="text-sm text-muted-foreground">Forms assigned to you, and anything waiting on your signature.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending your signature</CardTitle>
          <CardDescription>Someone else&apos;s form is waiting for you to sign, reject, or return it for correction.</CardDescription>
        </CardHeader>
        <CardContent>
          {!pendingSignaturesResult.ok ? (
            <p className="text-sm text-destructive">{pendingSignaturesResult.error}</p>
          ) : pendingSignaturesResult.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing waiting on you right now.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pendingSignaturesResult.data.map((instance) => {
                const mySignature = instance.signatures.find((signature) => signature.signerId === actingEmployeeId && signature.status === "PENDING")
                return (
                  <li key={instance.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{instance.formTemplate.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {instance.employee.firstName} {instance.employee.lastName}
                        {mySignature ? ` · ${mySignature.formSignatureStage.label ?? SIGNER_ROLE_LABELS[mySignature.formSignatureStage.role]}` : ""}
                      </p>
                    </div>
                    <Link href={`/staff/forms/${instance.id}`} className="text-xs font-medium text-primary hover:underline">
                      Review &amp; sign
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My forms</CardTitle>
          <CardDescription>Open one to fill it in, save a draft, or submit it.</CardDescription>
        </CardHeader>
        <CardContent>
          {!myFormsResult.ok ? (
            <p className="text-sm text-destructive">{myFormsResult.error}</p>
          ) : myFormsResult.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have no forms assigned right now.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {myFormsResult.data.map((instance) => (
                <li key={instance.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{instance.formTemplate.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {instance.formTemplate.category.name}
                      {instance.dueDate ? ` · Due ${new Date(instance.dueDate).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={STATUS_VARIANT[instance.status]}>{INSTANCE_STATUS_LABELS[instance.status]}</Badge>
                    <Link href={`/staff/forms/${instance.id}`} className="text-xs font-medium text-primary hover:underline">
                      Open
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
