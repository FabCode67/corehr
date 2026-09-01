import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchBands } from "@/lib/api/bands"
import { fetchStageDefinitions, fetchWorkflows } from "@/lib/api/recruitment"
import { getSession } from "@/lib/get-session"

import { RecruitmentTabs } from "../recruitment-tabs"
import { StageCatalogSection } from "./stage-catalog-section"
import { WorkflowsSection } from "./workflows-section"

export default async function RecruitmentWorkflowsPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [stagesResult, workflowsResult, bandsResult] = await Promise.all([
    fetchStageDefinitions(true),
    fetchWorkflows(true),
    fetchBands(),
  ])

  const stages = stagesResult.ok ? stagesResult.data : []
  const workflows = workflowsResult.ok ? workflowsResult.data : []
  const bands = bandsResult.ok ? bandsResult.data : []

  const loadError = !stagesResult.ok ? stagesResult.error : !workflowsResult.ok ? workflowsResult.error : null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Recruitment Workflows</h1>
        <p className="text-sm text-muted-foreground">
          Configure the candidate interview pipeline — the stage catalog and which stages apply to each Band / contract type.
        </p>
      </div>

      <RecruitmentTabs />

      {loadError ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stage Catalog</CardTitle>
              <CardDescription>The reusable interview stages available to build workflows from.</CardDescription>
            </CardHeader>
            <CardContent>
              <StageCatalogSection stages={stages} actingEmployeeId={actingEmployeeId} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workflows</CardTitle>
              <CardDescription>
                Each workflow maps to a Band rank range and/or contract type. The most specific match wins; otherwise the default workflow applies.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkflowsSection workflows={workflows} stages={stages} bands={bands} actingEmployeeId={actingEmployeeId} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
