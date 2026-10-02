"use client"

import { useState } from "react"
import { Download, FileSpreadsheet } from "lucide-react"

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

export default function EdwhReportPage() {
  const [month, setMonth] = useState(currentMonthInputValue)

  // The report's YEAR_MONTH column wants "YYYYMM" (no separator) — strip
  // the dash the <input type="month"> value uses.
  const yearMonth = month.replace("-", "")
  const canDownload = /^\d{6}$/.test(yearMonth)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">EDWH Report</h1>
        <p className="text-sm text-muted-foreground">
          BNR/EDWH regulatory submission — every employee, one row each, for the selected reporting period.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Generate report</CardTitle>
          <CardDescription>
            Choose the reporting month, then download the CSV. COUNTRY is derived from each employee&apos;s
            Nationality (RW/KE/UG/TZ — unrecognized nationalities export blank), and LE_BOOK is fixed at 035
            for every row.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="yearMonth">Reporting month</Label>
            <input
              id="yearMonth"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 w-48 rounded-md border border-input bg-background px-3 text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>

          <div>
            <a
              href={canDownload ? edwhReportUrl(yearMonth) : undefined}
              aria-disabled={!canDownload}
              className={cn(buttonVariants({ size: "sm" }), !canDownload && "pointer-events-none opacity-50")}
            >
              <Download className="mr-1.5 size-4" />
              Download CSV
            </a>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            <FileSpreadsheet className="mt-0.5 size-4 shrink-0" />
            <p>
              VISION_OUC, BNR_APPROVAL_REQD, DATE_OF_BNR_APPROVAL, PREVIOUS_EMPLOYER, and
              AREA_OF_SPECIALISATION have no source data in PeopleSuite yet, so those columns are exported
              blank for every row. DEPARTMENT_ID uses the Department&apos;s code, ROLE_CODE uses the
              employee&apos;s Position code, GRADE_CODE groups the Position Level into A (Director/Deputy
              Director), B (General Manager), C (Senior Manager/Manager/Assistant General Manager), or D
              (Assistant Manager/Officer and below), and EDUCATION uses their highest recorded
              qualification.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
