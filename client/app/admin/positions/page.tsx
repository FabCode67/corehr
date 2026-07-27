import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import { fetchPositionsPaginated } from "@/lib/api/positions"

import { deactivatePosition } from "./actions"

export default async function AdminPositionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const result = await fetchPositionsPaginated(page ? Number(page) : 1)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Positions</h1>
          <p className="text-sm text-muted-foreground">
            Roles in the org tree. Reporting lines are set per position, not hardcoded.
          </p>
        </div>
        <Link href="/admin/positions/new" className={buttonVariants({ size: "sm" })}>
          New position
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
            No positions yet.{" "}
            <Link href="/admin/positions/new" className="text-primary underline">
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
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Department / Unit</th>
                  <th className="px-4 py-3 font-medium">Level</th>
                  <th className="px-4 py-3 font-medium">Reports to</th>
                  <th className="px-4 py-3 font-medium">Employees</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.data.data.map((position) => (
                  <tr key={position.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{position.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {position.unit?.name ?? position.department?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {position.level?.code ?? position.level?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {position.reportsTo?.title ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {position.employees?.length ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={position.isActive ? "success" : "outline"}>
                        {position.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/positions/${position.id}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Edit
                        </Link>
                        {position.isActive ? (
                          <form action={deactivatePosition.bind(null, position.id)}>
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
            basePath="/admin/positions"
          />
        </Card>
      )}
    </div>
  )
}
