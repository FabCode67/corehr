"use client"

import { Button } from "@/components/ui/button"
import type { DepartmentScorecardRow } from "@/lib/api/executive-dashboard"

/** Downloads the department scorecard as a CSV opened by Excel. */
export function ExportScorecardButton({ rows }: { rows: DepartmentScorecardRow[] }) {
  function download() {
    const header = ["Department", "Headcount", "Open vacancies", "Average rating", "Mandatory training %", "Leave days YTD", "Exits (12 months)"]
    const lines = rows.map((r) => [r.departmentName, r.headcount, r.openVacancies, r.averageRating ?? "", r.trainingCompliancePercent ?? "", r.leaveDaysYtd, r.exitsLast12Months])
    const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `department-scorecard-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <Button type="button" size="sm" variant="outline" onClick={download}>
      Export scorecard (CSV)
    </Button>
  )
}
