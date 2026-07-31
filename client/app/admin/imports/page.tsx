import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchImportModules } from "@/lib/api/imports"
import { getSession } from "@/lib/get-session"

import { ImportManager } from "./import-manager"

/**
 * One-stop hub for every import module, including the ones without a
 * dedicated admin page of their own (Exit Management, Education,
 * Certifications, Family Members, Salary — none of these have a top-level
 * list page elsewhere in the app). The 8 modules that DO have a natural
 * home (Employees, Departments, Positions, Leave, Performance, Learning,
 * Onboarding Documents, Forms) also embed their own <ImportManager /> right
 * on their own page — this hub is the one place every module is guaranteed
 * to be reachable from, regardless.
 */
export default async function ImportsHubPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""
  const result = await fetchImportModules()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Bulk Imports</h1>
        <p className="text-sm text-muted-foreground">Import CSV or Excel data into any module — download a template, upload, review, and confirm.</p>
      </div>

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.data.map((module) => (
            <Card key={module.key}>
              <CardHeader>
                <CardTitle className="text-base">{module.label}</CardTitle>
                <CardDescription>Reference: {module.referenceKeyLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                <ImportManager moduleKey={module.key} moduleLabel={module.label} actingEmployeeId={actingEmployeeId} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
