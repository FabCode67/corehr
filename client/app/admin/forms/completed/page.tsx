import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchFormInstances, formInstancePdfUrl } from "@/lib/api/forms"
import { getSession } from "@/lib/get-session"

import { FormsTabs } from "../forms-tabs"

export default async function CompletedFormsPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""
  const result = await fetchFormInstances({ status: "COMPLETED" }, actingEmployeeId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Forms Management</h1>
        <p className="text-sm text-muted-foreground">Fully completed and signed forms — download any of them as a PDF record.</p>
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
          <CardContent className="py-10 text-center text-sm text-muted-foreground">No completed forms yet.</CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Form</th>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Completed on</th>
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
                    <td className="px-4 py-3 text-muted-foreground">{instance.completedAt ? new Date(instance.completedAt).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/admin/forms/instances/${instance.id}`} className="text-xs font-medium text-primary hover:underline">
                          View
                        </Link>
                        <a href={formInstancePdfUrl(instance.id, actingEmployeeId)} className={buttonVariants({ size: "xs", variant: "outline" })}>
                          PDF
                        </a>
                      </div>
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
