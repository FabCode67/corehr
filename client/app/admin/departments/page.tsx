import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import { fetchDepartmentsPaginated } from "@/lib/api/departments"
import { getSession } from "@/lib/get-session"

import { ImportManager } from "../imports/import-manager"
import { deactivateDepartment } from "./actions"

export default async function AdminDepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const [result, session] = await Promise.all([fetchDepartmentsPaginated(page ? Number(page) : 1), getSession()])
  const actingEmployeeId = session?.employeeId ?? ""

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Departments</h1>
          <p className="text-sm text-muted-foreground">
            Departments belong to a Function and may optionally have Units.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportManager moduleKey="departments" moduleLabel="Departments" actingEmployeeId={actingEmployeeId} />
          <Link href="/admin/departments/new" className={buttonVariants({ size: "sm" })}>
            New department
          </Link>
        </div>
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
            No departments yet.{" "}
            <Link href="/admin/departments/new" className="text-primary underline">
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
                  <th className="px-4 py-3 font-medium">Function</th>
                  <th className="px-4 py-3 font-medium">Units</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.data.data.map((department) => (
                  <tr key={department.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{department.name}</p>
                      {department.code ? (
                        <p className="text-xs text-muted-foreground">{department.code}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {department.function?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {department.units?.length ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={department.isActive ? "success" : "outline"}>
                        {department.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/departments/${department.id}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Edit
                        </Link>
                        {department.isActive ? (
                          <form action={deactivateDepartment.bind(null, department.id)}>
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
            basePath="/admin/departments"
          />
        </Card>
      )}
    </div>
  )
}
