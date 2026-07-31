import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchOnboardingHrOverview } from "@/lib/api/onboarding-documents"
import { getSession } from "@/lib/get-session"

import { ImportManager } from "../imports/import-manager"
import { OnboardingDocumentsTabs } from "./onboarding-documents-tabs"

export default async function OnboardingDocumentsDashboardPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""
  const result = await fetchOnboardingHrOverview(actingEmployeeId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Onboarding Documents</h1>
          <p className="text-sm text-muted-foreground">
            Every active employee with at least one assigned onboarding document, sorted with the least complete first.
          </p>
        </div>
        <ImportManager moduleKey="onboarding-documents" moduleLabel="Onboarding Documents" actingEmployeeId={actingEmployeeId} />
      </div>

      <OnboardingDocumentsTabs />

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : result.data.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">No onboarding documents assigned yet</CardTitle>
            <CardDescription>Assign documents to an employee from their profile page.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Employees tracked</p>
                <p className="text-2xl font-semibold text-foreground">{result.data.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Fully complete</p>
                <p className="text-2xl font-semibold text-foreground">
                  {result.data.filter((entry) => entry.percentageCompleted === 100).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Incomplete</p>
                <p className="text-2xl font-semibold text-destructive">
                  {result.data.filter((entry) => entry.percentageCompleted < 100).length}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium">Approved / Total</th>
                    <th className="px-4 py-3 font-medium">Progress</th>
                    <th className="px-4 py-3 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.data.map((entry) => (
                    <tr key={entry.employeeId} className={entry.percentageCompleted < 100 ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-muted/30"}>
                      <td className="px-4 py-3 font-medium text-foreground">{entry.employeeName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{entry.departmentName}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {entry.approved} / {entry.total}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                            <div
                              className={entry.percentageCompleted === 100 ? "h-full bg-emerald-500" : "h-full bg-primary"}
                              style={{ width: `${entry.percentageCompleted}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{entry.percentageCompleted}%</span>
                          {entry.percentageCompleted < 100 ? <Badge variant="destructive">Incomplete</Badge> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/employees/${entry.employeeId}`} className="text-xs font-medium text-primary hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
