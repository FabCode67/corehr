import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OrgChartTree } from "@/components/org-chart/org-chart-tree"
import { fetchOrgChart } from "@/lib/org-chart"

const LEGEND = [
  { swatch: "bg-[#0d2c4d] border border-white/20", label: "Standard position" },
  { swatch: "bg-[#0d2c4d] border border-[#B8860B]/60", label: "Executive position" },
  { swatch: "bg-[#0d2c4d] border border-destructive/60", label: "Vacant" },
]

export default async function AdminOrganizationPage() {
  const result = await fetchOrgChart()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Organizational Structure</h1>
        <p className="text-sm text-muted-foreground">
          Live reporting hierarchy generated from Function → Department → Unit → Position.
          Nothing here is hardcoded — every line comes from{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">Position.reportsToPositionId</code>
          .
        </p>
      </div>

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Make sure the NestJS API (<code className="rounded bg-muted px-1 py-0.5">server/</code>
            ) is running, and that{" "}
            <code className="rounded bg-muted px-1 py-0.5">client/.env</code>&apos;s{" "}
            <code className="rounded bg-muted px-1 py-0.5">API_URL</code> points at it — then
            reload this page.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {LEGEND.map((item) => (
              <span key={item.label} className="flex items-center gap-1.5">
                <span className={`size-3 rounded-sm ${item.swatch}`} />
                {item.label}
              </span>
            ))}
          </div>

          <Card className="overflow-x-auto border-white/10 bg-[#081a2e] p-0">
            <CardContent className="p-0">
              <OrgChartTree roots={result.data} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
