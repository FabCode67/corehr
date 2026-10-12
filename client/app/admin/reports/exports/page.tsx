import { AnalyticsFilters } from "@/app/admin/hr-analytics/analytics-filters"
import { parseAnalyticsFilters, type AnalyticsSearchParams } from "@/app/admin/hr-analytics/analytics-filters-utils"
import { CustomReportDialog } from "@/app/admin/hr-analytics/custom-report-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { executiveDashboardPdfUrl, hrAnalyticsExportSnapshotUrl, hrAnalyticsExportUrl } from "@/lib/api/export-urls"
import { fetchReportSections } from "@/lib/api/hr-analytics"
import { getSession } from "@/lib/get-session"

const linkClass =
  "inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted"

export default async function DataExportsPage({ searchParams }: { searchParams: Promise<AnalyticsSearchParams> }) {
  const raw = await searchParams
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""
  const filters = parseAnalyticsFilters(raw)

  const reportSectionsResult = await fetchReportSections(actingEmployeeId)
  const reportSections = reportSectionsResult.ok ? reportSectionsResult.data : []

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Data Exports</h1>
        <p className="text-sm text-muted-foreground">
          Download the HR analytics data for the filters below — moved here from HR Analytics.
        </p>
      </div>

      <AnalyticsFilters
        raw={raw}
        basePath="/admin/reports/exports"
        actingEmployeeId={actingEmployeeId}
        description="The filters below are applied to every export on this page."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analytics export</CardTitle>
          <CardDescription>Full analytics data in your format of choice.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {(["xlsx", "csv", "pdf", "pptx"] as const).map((format) => (
            <a key={format} href={hrAnalyticsExportUrl(format, filters, actingEmployeeId)} className={linkClass}>
              Export {format.toUpperCase()}
            </a>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summaries &amp; custom reports</CardTitle>
          <CardDescription>One-page infographic, executive dashboard, or pick your own sections.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <a
            href={hrAnalyticsExportSnapshotUrl(filters, actingEmployeeId)}
            className={linkClass}
            title="A single-page branded infographic — headcount, gender, age/tenure/band, and turnover at a glance"
          >
            Statistics Snapshot
          </a>
          <a href={executiveDashboardPdfUrl(actingEmployeeId)} className={linkClass}>
            Executive Dashboard PDF
          </a>
          {reportSections.length > 0 ? (
            <CustomReportDialog sections={reportSections} filters={filters} actingEmployeeId={actingEmployeeId} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
