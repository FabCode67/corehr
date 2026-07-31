import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import { fetchImportHistory, fetchImportModules, type ImportJobStatus } from "@/lib/api/imports"

const STATUS_BADGE_VARIANT: Record<ImportJobStatus, "outline" | "success" | "secondary" | "destructive" | "default"> = {
  DRAFT: "outline",
  IMPORTING: "default",
  COMPLETED: "success",
  PARTIALLY_COMPLETED: "secondary",
  FAILED: "destructive",
}

const STATUS_LABELS: Record<ImportJobStatus, string> = {
  DRAFT: "Draft",
  IMPORTING: "Importing",
  COMPLETED: "Completed",
  PARTIALLY_COMPLETED: "Partially Completed",
  FAILED: "Failed",
}

export default async function ImportHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string; page?: string }>
}) {
  const params = await searchParams
  const page = params.page ? Number(params.page) : 1

  const [historyResult, modulesResult] = await Promise.all([
    fetchImportHistory({ module: params.module, page }),
    fetchImportModules(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Import History</h1>
        <p className="text-sm text-muted-foreground">Every bulk import run across all modules, with audit detail and downloadable reports.</p>
      </div>

      {modulesResult.ok ? (
        <div className="flex flex-wrap gap-1.5">
          <Link
            href="/admin/imports/history"
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${!params.module ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
          >
            All Modules
          </Link>
          {modulesResult.data.map((module) => (
            <Link
              key={module.key}
              href={`/admin/imports/history?module=${module.key}`}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${params.module === module.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
            >
              {module.label}
            </Link>
          ))}
        </div>
      ) : null}

      {!historyResult.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{historyResult.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : historyResult.data.items.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">No imports yet</CardTitle>
            <CardDescription>Run an import from any module page — it will show up here.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Module</th>
                    <th className="px-4 py-3 font-medium">Filename</th>
                    <th className="px-4 py-3 font-medium">Uploaded By</th>
                    <th className="px-4 py-3 font-medium">Upload Date</th>
                    <th className="px-4 py-3 font-medium">Total Rows</th>
                    <th className="px-4 py-3 font-medium">Imported</th>
                    <th className="px-4 py-3 font-medium">Failed</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyResult.data.items.map((job) => (
                    <tr key={job.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{job.module}</td>
                      <td className="px-4 py-3 text-muted-foreground">{job.fileName}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {job.importedBy.firstName} {job.importedBy.lastName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(job.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</td>
                      <td className="px-4 py-3 text-muted-foreground">{job.totalRows}</td>
                      <td className="px-4 py-3 text-muted-foreground">{job.newRecords + job.updatedRecords}</td>
                      <td className="px-4 py-3 text-muted-foreground">{job.failedRecords}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE_VARIANT[job.status]}>{STATUS_LABELS[job.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/imports/history/${job.id}`} className="text-xs font-medium text-primary hover:underline">
                          View Report
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination
            page={historyResult.data.page}
            totalPages={historyResult.data.totalPages}
            total={historyResult.data.total}
            pageSize={historyResult.data.pageSize}
            basePath="/admin/imports/history"
            searchParams={{ module: params.module }}
          />
        </>
      )}
    </div>
  )
}
