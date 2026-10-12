import Link from "next/link"
import { Download, FileSpreadsheet, Users } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const REPORTS = [
  {
    title: "EDWH Report",
    href: "/admin/reports/edwh",
    icon: FileSpreadsheet,
    description: "BNR/EDWH regulatory submission — every employee, one row each, as CSV.",
  },
  {
    title: "Workforce Report",
    href: "/admin/reports/workforce",
    icon: Users,
    description: "Position fill rate, organizational structure, and employee experience.",
  },
  {
    title: "Data Exports",
    href: "/admin/reports/exports",
    icon: Download,
    description: "Analytics as XLSX / CSV / PDF / PPTX, the statistics snapshot, and custom reports.",
  },
] as const

export default function AdminReportsPage() {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Regulatory submissions, detailed workforce reports, and data exports. Key metrics and trends stay on HR Analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report) => (
          <Link key={report.href} href={report.href} className="group">
            <Card className="h-full transition-colors group-hover:bg-muted/40">
              <CardHeader>
                <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <report.icon className="size-5" />
                </span>
                <CardTitle className="text-base">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-xs font-medium text-primary">Open →</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
