import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import { fetchBranchesPaginated } from "@/lib/api/branches"

import { deactivateBranch } from "./actions"

export default async function AdminBranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const result = await fetchBranchesPaginated(page ? Number(page) : 1)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Branches</h1>
          <p className="text-sm text-muted-foreground">
            Headquarters and branch locations employees can be assigned to.
          </p>
        </div>
        <Link href="/admin/branches/new" className={buttonVariants({ size: "sm" })}>
          New branch
        </Link>
      </div>

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : result.data.data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No branches yet.{" "}
            <Link href="/admin/branches/new" className="text-primary underline">
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
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.data.data.map((branch) => (
                  <tr key={branch.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{branch.name}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{branch.code ?? "—"}</td>
                    <td className="px-4 py-3">
                      {branch.isHeadquarters ? (
                        <Badge variant="secondary">Headquarters</Badge>
                      ) : (
                        <span className="text-muted-foreground">Branch</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={branch.isActive ? "success" : "outline"}>
                        {branch.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/branches/${branch.id}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Edit
                        </Link>
                        {branch.isActive && !branch.isHeadquarters ? (
                          <form action={deactivateBranch.bind(null, branch.id)}>
                            <button
                              type="submit"
                              className="text-xs font-medium text-destructive hover:underline"
                            >
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
          <Pagination
            page={result.data.page}
            totalPages={result.data.totalPages}
            total={result.data.total}
            pageSize={result.data.pageSize}
            basePath="/admin/branches"
          />
        </Card>
      )}
    </div>
  )
}
