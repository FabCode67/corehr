import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchSanctionTypes } from "@/lib/api/employee-relations"
import { deleteSanctionType } from "@/lib/api/employee-relations-actions"

import { EmployeeRelationsTabs } from "../employee-relations-tabs"

export default async function SanctionTypesPage() {
  const result = await fetchSanctionTypes(true)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Employee Relations</h1>
          <p className="text-sm text-muted-foreground">
            Sanction types available when issuing a disciplinary decision — HR can add more here without any code changes.
          </p>
        </div>
        <Link href="/admin/employee-relations/sanction-types/new" className={buttonVariants({ size: "sm" })}>
          New sanction type
        </Link>
      </div>

      <EmployeeRelationsTabs />

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.data.map((sanctionType) => (
                  <tr key={sanctionType.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{sanctionType.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{sanctionType.description ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={sanctionType.isActive ? "success" : "outline"}>{sanctionType.isActive ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/admin/employee-relations/sanction-types/${sanctionType.id}`} className="text-xs font-medium text-primary hover:underline">
                          Edit
                        </Link>
                        {sanctionType.isActive ? (
                          <form action={deleteSanctionType.bind(null, sanctionType.id)}>
                            <button type="submit" className="text-xs font-medium text-destructive hover:underline">
                              Deactivate
                            </button>
                          </form>
                        ) : null}
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
