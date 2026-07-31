import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchImportJob, importErrorReportUrl, importJobFileUrl, importSuccessReportUrl, type ImportJobStatus } from "@/lib/api/imports"
import { getSession } from "@/lib/get-session"

import { ReimportPanel } from "./reimport-panel"

const STATUS_BADGE_VARIANT: Record<ImportJobStatus, "outline" | "success" | "secondary" | "destructive" | "default"> = {
  DRAFT: "outline",
  IMPORTING: "default",
  COMPLETED: "success",
  PARTIALLY_COMPLETED: "secondary",
  FAILED: "destructive",
}

export default async function ImportJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""
  const result = await fetchImportJob(id)

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-6">
        <Link href="/admin/imports/history" className="text-xs font-medium text-primary hover:underline">
          ← Back to Import History
        </Link>
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const job = result.data
  const outcomes = job.rowResults ?? []
  const errorOutcomes = outcomes.filter((o) => o.action === "failed" || o.action === "skipped")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/imports/history" className="text-xs font-medium text-primary hover:underline">
          ← Back to Import History
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {job.label} Import — {job.fileName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Uploaded by {job.importedBy.firstName} {job.importedBy.lastName} on {new Date(job.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
          <Badge variant={STATUS_BADGE_VARIANT[job.status]}>{job.status.replace("_", " ")}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <SummaryTile label="Total Records" value={job.totalRows} />
        <SummaryTile label="New Records" value={job.newRecords} />
        <SummaryTile label="Updated Records" value={job.updatedRecords} />
        <SummaryTile label="Skipped Records" value={job.skippedRecords} />
        <SummaryTile label="Failed Records" value={job.failedRecords} />
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={importJobFileUrl(job.id)} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Download Original File
        </a>
        <a href={importErrorReportUrl(job.id)} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Download Error Report
        </a>
        <a href={importSuccessReportUrl(job.id)} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Download Success Report
        </a>
      </div>

      <ReimportPanel jobId={job.id} moduleLabel={job.label} actingEmployeeId={actingEmployeeId} />

      <Card className="overflow-hidden p-0">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Row Errors</CardTitle>
          <CardDescription>Every skipped or failed row from this run.</CardDescription>
        </CardHeader>
        {errorOutcomes.length === 0 ? (
          <CardContent className="py-6 text-sm text-muted-foreground">No errors — every row imported cleanly.</CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Row</th>
                  <th className="px-4 py-3 font-medium">Employee Number</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {errorOutcomes.map((outcome) => (
                  <tr key={outcome.row}>
                    <td className="px-4 py-3 text-muted-foreground">{outcome.row}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{outcome.employeeNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-destructive">{outcome.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  )
}
