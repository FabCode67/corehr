"use client"

import { useState } from "react"
import { CalendarDays, Download, FileSpreadsheet } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { edwhReportUrl } from "@/lib/api/export-urls"
import { cn } from "@/lib/utils"

/** YYYY-MM (what `<input type="month">` produces) for the current month —
 *  the sensible default so HR doesn't have to pick anything to generate
 *  the current period's submission. */
function currentMonthInputValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

type Source = "auto" | "profile" | "blank"

const SOURCE_BADGE: Record<Source, { label: string; variant: "success" | "secondary" | "outline" }> = {
  auto: { label: "Automatic", variant: "success" },
  profile: { label: "From profile", variant: "secondary" },
  blank: { label: "Left blank", variant: "outline" },
}

const COLUMN_GROUPS: { title: string; items: { column: string; detail: string; source: Source }[] }[] = [
  {
    title: "Fixed & derived",
    items: [
      { column: "COUNTRY", detail: "From Nationality (RW / KE / UG / TZ); blank if unrecognized", source: "auto" },
      { column: "LE_BOOK", detail: "Always 035", source: "auto" },
      { column: "YEAR_MONTH", detail: "Month the employee's EDWH data last changed", source: "auto" },
      { column: "GRADE_CODE", detail: "A Director/Deputy · B General Manager · C Senior Manager/Manager/AGM · D Assistant Manager and below", source: "auto" },
      { column: "STAFF_STATUS", detail: "0 Active · 1 Inactive", source: "auto" },
    ],
  },
  {
    title: "Picked on the employee profile",
    items: [
      { column: "DEPARTMENT_ID", detail: "Department code", source: "profile" },
      { column: "ROLE_CODE", detail: "Position code", source: "profile" },
      { column: "EDUCATION", detail: "BNR education code of the highest qualification", source: "profile" },
      { column: "PROFESSIONAL_CERTIFICATES", detail: "BNR certificate codes, separated by semicolons", source: "profile" },
      { column: "AREA_OF_SPECIALISATION", detail: "Employment Details step", source: "profile" },
      { column: "BNR_APPROVAL_REQD / DATE_OF_BNR_APPROVAL", detail: "BNR approval section of Employment Details", source: "profile" },
    ],
  },
  {
    title: "Not tracked yet",
    items: [
      { column: "VISION_OUC", detail: "No source data in PeopleSuite", source: "blank" },
      { column: "PREVIOUS_EMPLOYER", detail: "No source data in PeopleSuite", source: "blank" },
    ],
  },
]

export default function EdwhReportPage() {
  const [month, setMonth] = useState(currentMonthInputValue)

  // The report's YEAR_MONTH column wants "YYYYMM" (no separator) — strip
  // the dash the <input type="month"> value uses.
  const yearMonth = month.replace("-", "")
  const canDownload = /^\d{6}$/.test(yearMonth)

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">EDWH Report</h1>
        <p className="text-sm text-muted-foreground">
          BNR/EDWH regulatory submission — every employee, one row each.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileSpreadsheet className="size-5" />
            </span>
            <div>
              <CardTitle className="text-base">Generate report</CardTitle>
              <CardDescription>Comma-delimited CSV in BNR&apos;s 26-column order.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="yearMonth" className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-muted-foreground" />
                Reporting month
              </Label>
              <input
                id="yearMonth"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-9 w-48 rounded-md border border-input bg-background px-3 text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
            <a
              href={canDownload ? edwhReportUrl(yearMonth) : undefined}
              aria-disabled={!canDownload}
              className={cn(buttonVariants({ size: "sm" }), "h-9", !canDownload && "pointer-events-none opacity-50")}
            >
              <Download className="mr-1.5 size-4" />
              Download CSV
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Employees exported for the first time are stamped with this month; after that, each
            employee&apos;s YEAR_MONTH only moves when their EDWH data changes.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where each column comes from</CardTitle>
          <CardDescription>Fill these in on the employee profile and they flow into the report.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {COLUMN_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.title}</h3>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {group.items.map((item) => (
                  <li key={item.column} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-medium text-foreground">{item.column}</p>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <Badge variant={SOURCE_BADGE[item.source].variant}>{SOURCE_BADGE[item.source].label}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
