import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/ui/pagination"
import { fetchBranches, fetchBranchesPaginated } from "@/lib/api/branches"

import { activateBranch, deactivateBranch } from "./actions"
import { LocationsMapLoader } from "./locations-map-client"

export default async function AdminBranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const { page, search } = await searchParams
  const [result, allBranchesResult] = await Promise.all([
    fetchBranchesPaginated(page ? Number(page) : 1, undefined, search),
    // Unpaginated — the map plots every location, not just the current page
    // (and isn't affected by the table's search box).
    fetchBranches(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Locations</h1>
          <p className="text-sm text-muted-foreground">
            Headquarters and branch locations employees can be assigned to.
          </p>
        </div>
        <Link href="/admin/branches/new" className={buttonVariants({ size: "sm" })}>
          New location
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Map</CardTitle>
          <CardDescription>Locations with a latitude/longitude set — edit a location to add coordinates.</CardDescription>
        </CardHeader>
        <CardContent>
          <LocationsMapLoader branches={allBranchesResult.ok ? allBranchesResult.data : []} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Search</label>
              <Input name="search" placeholder="Name or code…" defaultValue={search ?? ""} className="w-56" />
            </div>
            <button type="submit" className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80">
              Apply
            </button>
            {search ? (
              <Link href="/admin/branches" className="h-9 rounded-lg border border-border px-3 text-sm font-medium text-foreground leading-9 hover:bg-muted">
                Reset
              </Link>
            ) : null}
          </form>
        </CardContent>
      </Card>

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
            No locations yet.{" "}
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
                  <th className="px-4 py-3 font-medium">Employees</th>
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
                        <span className="text-muted-foreground">Location</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{branch._count?.employees ?? 0}</td>
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
                        {!branch.isActive ? (
                          <form action={activateBranch.bind(null, branch.id)}>
                            <button
                              type="submit"
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              Activate
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
            searchParams={{ search }}
          />
        </Card>
      )}
    </div>
  )
}
