import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchDepartments } from "@/lib/api/departments"
import { fetchClearanceFormTemplates } from "@/lib/api/exit-clearance"
import { createClearanceFormTemplate, deactivateClearanceFormTemplate, updateClearanceFormTemplate } from "@/lib/api/exit-clearance-actions"
import { fetchPositions } from "@/lib/api/positions"

import { ExitClearanceTabs } from "../exit-clearance-tabs"
import { TemplateDialog } from "./template-dialog"

function requirementsSummary(template: { requiresEmployeeCompletion: boolean; requiresConfirmation: boolean; requiresSignature: boolean }) {
  const parts = []
  if (template.requiresEmployeeCompletion) parts.push("Employee completion")
  if (template.requiresConfirmation) parts.push("Confirmation")
  if (template.requiresSignature) parts.push("Signature")
  return parts.join(" · ")
}

export default async function ExitClearanceTemplatesPage() {
  const [templatesResult, departmentsResult, positionsResult] = await Promise.all([
    fetchClearanceFormTemplates(true),
    fetchDepartments(),
    fetchPositions(),
  ])

  const templates = templatesResult.ok ? templatesResult.data : []
  const departments = departmentsResult.ok ? departmentsResult.data : []
  const positions = positionsResult.ok ? positionsResult.data : []
  const loadError = !templatesResult.ok ? templatesResult.error : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Exit Clearance</h1>
          <p className="text-sm text-muted-foreground">
            Configure the departmental clearance forms auto-assigned whenever HR starts an employee&apos;s exit process.
          </p>
        </div>
        <TemplateDialog departments={departments} positions={positions} action={createClearanceFormTemplate} triggerLabel="New clearance form" />
      </div>

      <ExitClearanceTabs />

      {loadError ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
        </Card>
      ) : templates.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">No clearance forms configured yet</CardTitle>
            <CardDescription>
              Add one for each department that needs to sign off on an exit — e.g. Access Card (Security), Laptop Return (IT), Credit Clearance (Credit).
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map((template) => (
            <Card key={template.id} className={template.isActive ? "" : "opacity-60"}>
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{template.name}</p>
                    {template.isMandatory ? <Badge variant="destructive">Mandatory</Badge> : <Badge variant="outline">Optional</Badge>}
                    {!template.isActive ? <Badge variant="secondary">Inactive</Badge> : null}
                  </div>
                  {template.description ? <p className="text-sm text-muted-foreground">{template.description}</p> : null}
                  <p className="text-xs text-muted-foreground">
                    {template.responsibleDepartment.name} · {template.responsiblePosition.title} · {template.daysToComplete}-day due window
                  </p>
                  <p className="text-xs text-muted-foreground">{requirementsSummary(template)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <TemplateDialog
                    departments={departments}
                    positions={positions}
                    template={template}
                    action={updateClearanceFormTemplate.bind(null, template.id)}
                    triggerLabel="Edit"
                    triggerVariant="outline"
                  />
                  {template.isActive ? (
                    <form action={deactivateClearanceFormTemplate.bind(null, template.id)}>
                      <Button type="submit" variant="outline" size="sm">
                        Deactivate
                      </Button>
                    </form>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
