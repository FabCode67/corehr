import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmployees } from "@/lib/api/employees"

const STATUS_VARIANT: Record<string, "success" | "destructive"> = {
  ACTIVE: "success",
  EXIT: "destructive",
}

export default async function AdminEmployeesPage() {
  // Employee records are never deleted — exited employees stay visible
  // (with a status badge) for historical reporting, per the spec.
  const result = await fetchEmployees(true)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Employees</h1>
          <p className="text-sm text-muted-foreground">
            Employee registration, position assignment, and band tracking.
          </p>
        </div>
        <Link href="/admin/employees/new" className={buttonVariants({ size: "sm" })}>
          New employee
        </Link>
      </div>

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
            No employees yet.{" "}
            <Link href="/admin/employees/new" className="text-primary underline">
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
                  <th className="px-4 py-3 font-medium">Position</th>
                  <th className="px-4 py-3 font-medium">Department / Unit</th>
                  <th className="px-4 py-3 font-medium">Band</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.data.map((employee) => (
                  <tr key={employee.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{employee.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {employee.position?.title ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {employee.position?.unit?.name ?? employee.position?.department.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {employee.band?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[employee.employmentStatus] ?? "destructive"}>
                        {employee.employmentStatus === "ACTIVE" ? "Active" : "Exit"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/employees/${employee.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Manage
                      </Link>
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
