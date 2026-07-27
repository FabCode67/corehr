import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { deactivateInstitution } from "@/lib/api/learning-actions"
import { fetchInstitutions } from "@/lib/api/learning"

import { LearningTabs } from "../learning-tabs"

export default async function InstitutionsPage() {
  const result = await fetchInstitutions(true)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Learning & Development</h1>
          <p className="text-sm text-muted-foreground">
            Institutions and training providers that deliver courses.
          </p>
        </div>
        <Link href="/admin/learning/institutions/new" className={buttonVariants({ size: "sm" })}>
          New institution
        </Link>
      </div>

      <LearningTabs />

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
            No institutions yet.{" "}
            <Link href="/admin/learning/institutions/new" className="text-primary underline">
              Add the first one
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
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Website</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.data.map((institution) => (
                  <tr key={institution.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{institution.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {institution.contactEmail ?? institution.contactPhone ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{institution.website ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={institution.isActive ? "success" : "outline"}>
                        {institution.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/learning/institutions/${institution.id}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Edit
                        </Link>
                        {institution.isActive ? (
                          <form action={deactivateInstitution.bind(null, institution.id)}>
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
