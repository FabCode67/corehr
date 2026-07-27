import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmployees } from "@/lib/api/employees"

import { LearningTabs } from "../learning-tabs"

export default async function LearningPlansPage() {
  const result = await fetchEmployees(false)
  const employees = result.ok ? [...result.data].sort((a, b) => a.firstName.localeCompare(b.firstName)) : []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Learning & Development</h1>
        <p className="text-sm text-muted-foreground">
          Every employee&apos;s individual learning plan — assigned, completed, in progress, overdue, upcoming, and
          recommended courses.
        </p>
      </div>

      <LearningTabs />

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
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Employee number</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map((employee) => (
                  <tr key={employee.employeeNumber} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {employee.firstName} {employee.lastName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{employee.employeeNumber}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/learning/plans/${employee.employeeNumber}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View learning plan
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
