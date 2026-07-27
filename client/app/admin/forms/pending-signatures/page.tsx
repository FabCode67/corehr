import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchPendingSignatures, SIGNER_ROLE_LABELS } from "@/lib/api/forms"
import { getSession } from "@/lib/get-session"

import { FormsTabs } from "../forms-tabs"

export default async function PendingSignaturesPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""
  const result = await fetchPendingSignatures(actingEmployeeId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Forms Management</h1>
        <p className="text-sm text-muted-foreground">Forms currently waiting on your signature.</p>
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
          <CardContent className="py-10 text-center text-sm text-muted-foreground">Nothing waiting on your signature right now.</CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Form</th>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Your stage</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.data.map((instance) => {
                  const mySignature = instance.signatures.find((signature) => signature.signerId === actingEmployeeId && signature.status === "PENDING")
                  return (
                    <tr key={instance.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{instance.formTemplate.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {instance.employee.firstName} {instance.employee.lastName}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {mySignature ? mySignature.formSignatureStage.label ?? SIGNER_ROLE_LABELS[mySignature.formSignatureStage.role] : "—"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{instance.submittedAt ? new Date(instance.submittedAt).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/forms/instances/${instance.id}`} className="text-xs font-medium text-primary hover:underline">
                          Review &amp; sign
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
