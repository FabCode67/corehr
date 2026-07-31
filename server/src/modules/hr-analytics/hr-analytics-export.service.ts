import { Injectable } from "@nestjs/common"

import PDFDocument from "pdfkit"
import PptxGenJS from "pptxgenjs"
import * as XLSX from "xlsx"

import { HrAnalyticsDelegatedService } from "./hr-analytics-delegated.service"
import type { HrAnalyticsFilters } from "./hr-analytics-filters.util"
import { HrAnalyticsService } from "./hr-analytics.service"

/** pptxgenjs's addTable() wants each row as TableCell[] (`{ text }`
 *  objects), not plain strings — this just wraps a row of plain strings
 *  into that shape so the table-building code below can stay readable. */
function tableRow(cells: Array<string | number>): PptxGenJS.TableCell[] {
  return cells.map((cell) => ({ text: String(cell) }))
}

interface ExportBundle {
  totalStaff: Awaited<ReturnType<HrAnalyticsService["totalStaff"]>>
  averageAge: Awaited<ReturnType<HrAnalyticsService["averageAge"]>>
  bandDistribution: Awaited<ReturnType<HrAnalyticsService["bandDistribution"]>>
  attritionRate: Awaited<ReturnType<HrAnalyticsService["attritionRate"]>>
  positionFillRate: Awaited<ReturnType<HrAnalyticsService["positionFillRate"]>>
  leaveUtilization: Awaited<ReturnType<HrAnalyticsService["leaveUtilizationSummary"]>>
  employeeDistribution: Awaited<ReturnType<HrAnalyticsService["employeeDistributionByDepartment"]>>
  exitSummary: Awaited<ReturnType<HrAnalyticsService["exitSummary"]>>
  demographics: Awaited<ReturnType<HrAnalyticsService["employeeDemographics"]>>
  performanceDistribution: Awaited<ReturnType<HrAnalyticsDelegatedService["performanceDistribution"]>>
  learning: Awaited<ReturnType<HrAnalyticsDelegatedService["learningAnalyticsFor"]>>
}

/**
 * Report export — Excel, CSV, PDF, PowerPoint. Excel uses the `xlsx`
 * package already installed for the Bulk Import framework's template
 * downloads (see spreadsheet.util.ts) rather than adding a second Excel
 * library. PDF mirrors ExecutiveDashboardPdfService's section() pattern.
 * PowerPoint uses pptxgenjs's native chart types (bar/pie/line) so the
 * generated .pptx has real, editable PowerPoint charts, not embedded images.
 */
@Injectable()
export class HrAnalyticsExportService {
  constructor(
    private readonly hrAnalyticsService: HrAnalyticsService,
    private readonly delegated: HrAnalyticsDelegatedService
  ) {}

  private async buildBundle(filters: HrAnalyticsFilters): Promise<ExportBundle> {
    const [totalStaff, averageAge, bandDistribution, attritionRate, positionFillRate, leaveUtilization, employeeDistribution, exitSummary, demographics, performanceDistribution, learning] =
      await Promise.all([
        this.hrAnalyticsService.totalStaff(filters),
        this.hrAnalyticsService.averageAge(filters),
        this.hrAnalyticsService.bandDistribution(filters),
        this.hrAnalyticsService.attritionRate(filters),
        this.hrAnalyticsService.positionFillRate(filters),
        this.hrAnalyticsService.leaveUtilizationSummary(filters),
        this.hrAnalyticsService.employeeDistributionByDepartment(filters),
        this.hrAnalyticsService.exitSummary(filters),
        this.hrAnalyticsService.employeeDemographics(filters),
        this.delegated.performanceDistribution(filters),
        this.delegated.learningAnalyticsFor(filters),
      ])

    return { totalStaff, averageAge, bandDistribution, attritionRate, positionFillRate, leaveUtilization, employeeDistribution, exitSummary, demographics, performanceDistribution, learning }
  }

  /** Rule-based summary lines — NOT the AI-generated insights the spec
   *  flags as a Future Enhancement (see hr-analytics.module.ts's doc
   *  comment). Simple threshold/ranking logic over numbers already computed
   *  above, same spirit as the spec's own examples but without an LLM. */
  private buildInsights(bundle: ExportBundle): string[] {
    const insights: string[] = []

    if (bundle.attritionRate.breakdown.byDepartment[0]) {
      const top = bundle.attritionRate.breakdown.byDepartment[0]
      insights.push(`${top.label} has the highest number of exits this period (${top.count}).`)
    }
    if (bundle.positionFillRate.byDepartment.some((d) => d.fillRate < 80)) {
      const worst = [...bundle.positionFillRate.byDepartment].sort((a, b) => a.fillRate - b.fillRate)[0]
      insights.push(`${worst.name} has the lowest position fill rate at ${worst.fillRate}% (${worst.filled}/${worst.total} filled).`)
    }
    if (bundle.learning.amlCompletionRate !== null && bundle.learning.amlCompletionRate < 100) {
      insights.push(`AML training completion is at ${bundle.learning.amlCompletionRate}%, below full compliance.`)
    }
    if (bundle.attritionRate.changePercent !== 0) {
      const direction = bundle.attritionRate.changePercent > 0 ? "increased" : "decreased"
      insights.push(`Attrition has ${direction} by ${Math.abs(bundle.attritionRate.changePercent)} percentage points compared to last year.`)
    }
    if (insights.length === 0) insights.push("No notable outliers detected in the current filter selection.")

    return insights
  }

  // ==== Excel ================================================================

  async generateExcel(filters: HrAnalyticsFilters): Promise<Buffer> {
    const bundle = await this.buildBundle(filters)
    const workbook = XLSX.utils.book_new()

    const summarySheet = XLSX.utils.aoa_to_sheet([
      ["HR Analytics Dashboard — Summary"],
      [],
      ["Total Active Staff", bundle.totalStaff.activeCount],
      ["New Joiners (period)", bundle.totalStaff.newJoined],
      ["Exits (period)", bundle.totalStaff.exited],
      ["Change vs Last Year", bundle.totalStaff.changePercent !== null ? `${bundle.totalStaff.changePercent}%` : "N/A"],
      ["Average Age", bundle.averageAge.overall ?? "N/A"],
      ["Attrition Rate", `${bundle.attritionRate.rate}%`],
      ["Position Fill Rate", `${bundle.positionFillRate.fillRate}% (${bundle.positionFillRate.filled}/${bundle.positionFillRate.total})`],
      ["Leave Utilization", `${bundle.leaveUtilization.utilizationPercent}%`],
    ])
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")

    const bandSheet = XLSX.utils.json_to_sheet(bundle.bandDistribution.map((b) => ({ Band: b.bandName, Count: b.count, "Percent": b.percent })))
    XLSX.utils.book_append_sheet(workbook, bandSheet, "Band Distribution")

    const deptSheet = XLSX.utils.json_to_sheet(bundle.employeeDistribution.map((d) => ({ Department: d.departmentName, Count: d.count, "Percent": d.percent })))
    XLSX.utils.book_append_sheet(workbook, deptSheet, "By Department")

    const exitSheet = XLSX.utils.json_to_sheet(bundle.exitSummary.byReason.map((r) => ({ "Exit Reason": r.label, Count: r.count })))
    XLSX.utils.book_append_sheet(workbook, exitSheet, "Exits by Reason")

    const exitTrendSheet = XLSX.utils.json_to_sheet(bundle.exitSummary.trend.map((t) => ({ Year: t.year, Exits: t.exits })))
    XLSX.utils.book_append_sheet(workbook, exitTrendSheet, "Exit Trend")

    const ageSheet = XLSX.utils.json_to_sheet(bundle.demographics.ageHistogram.map((a) => ({ "Age Bracket": a.bucket, Count: a.count })))
    XLSX.utils.book_append_sheet(workbook, ageSheet, "Age Distribution")

    const perfSheet = XLSX.utils.json_to_sheet(bundle.performanceDistribution.map((p: { label: string; count: number; actualPercentage: number }) => ({ Rating: p.label, Count: p.count, Percent: p.actualPercentage })))
    XLSX.utils.book_append_sheet(workbook, perfSheet, "Performance Distribution")

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer
  }

  // ==== CSV (flat KPI summary — CSV has no multi-sheet concept) ====================

  async generateCsv(filters: HrAnalyticsFilters): Promise<string> {
    const bundle = await this.buildBundle(filters)
    const rows: [string, string | number][] = [
      ["Total Active Staff", bundle.totalStaff.activeCount],
      ["New Joiners (period)", bundle.totalStaff.newJoined],
      ["Exits (period)", bundle.totalStaff.exited],
      ["Average Age", bundle.averageAge.overall ?? ""],
      ["Attrition Rate (%)", bundle.attritionRate.rate],
      ["Position Fill Rate (%)", bundle.positionFillRate.fillRate],
      ["Leave Utilization (%)", bundle.leaveUtilization.utilizationPercent],
      ...bundle.bandDistribution.map((b) => [`Band: ${b.bandName}`, b.count] as [string, number]),
      ...bundle.employeeDistribution.map((d) => [`Department: ${d.departmentName}`, d.count] as [string, number]),
    ]

    const escape = (value: string | number) => {
      const str = String(value)
      return /[",\n]/.test(str) ? `"${str.replaceAll('"', '""')}"` : str
    }
    return ["Metric,Value", ...rows.map(([k, v]) => `${escape(k)},${escape(v)}`)].join("\n")
  }

  // ==== PDF ================================================================

  async generatePdf(filters: HrAnalyticsFilters): Promise<Buffer> {
    const bundle = await this.buildBundle(filters)
    const doc = new PDFDocument({ margin: 50, size: "A4" })
    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))))

    doc.fontSize(18).text("HR Analytics Dashboard", { align: "left" })
    doc.fontSize(10).fillColor("#555555").text(`Generated ${new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`)
    doc.fillColor("black").moveDown()

    this.section(doc, "Total Staff", [
      ["Active employees", bundle.totalStaff.activeCount],
      ["New joiners (period)", bundle.totalStaff.newJoined],
      ["Exits (period)", bundle.totalStaff.exited],
      ["Change vs last year", bundle.totalStaff.changePercent !== null ? `${bundle.totalStaff.changePercent}%` : "N/A"],
    ])

    this.section(doc, "Average Age", [["Organization average", bundle.averageAge.overall ?? "N/A"]])

    this.section(
      doc,
      "Band Distribution",
      bundle.bandDistribution.map((b) => [b.bandName, `${b.count} (${b.percent}%)`])
    )

    this.section(doc, "Attrition Rate", [
      ["Current rate", `${bundle.attritionRate.rate}%`],
      ["Previous year", `${bundle.attritionRate.previousYearRate}%`],
      ["Exits this period", bundle.attritionRate.exits],
    ])

    this.section(doc, "Position Fill Rate", [
      ["Fill rate", `${bundle.positionFillRate.fillRate}%`],
      ["Filled / Total", `${bundle.positionFillRate.filled} / ${bundle.positionFillRate.total}`],
    ])

    this.section(doc, "Leave Utilization", [
      ["Utilization", `${bundle.leaveUtilization.utilizationPercent}%`],
      ["Total entitlement (days)", bundle.leaveUtilization.totalEntitlement],
      ["Total taken (days)", bundle.leaveUtilization.totalTaken],
    ])

    this.section(
      doc,
      "Exit Summary",
      bundle.exitSummary.byReason.map((r) => [r.label, r.count])
    )

    doc.addPage()
    doc.fontSize(14).text("Key HR Insights", { underline: true })
    doc.moveDown(0.5)
    for (const insight of this.buildInsights(bundle)) {
      doc.fontSize(10).fillColor("#333333").text(`• ${insight}`)
      doc.moveDown(0.3)
    }

    doc.end()
    return done
  }

  private section(doc: PDFKit.PDFDocument, title: string, rows: [string, string | number][]) {
    doc.fontSize(13).fillColor("black").text(title, { underline: true })
    doc.moveDown(0.3)
    for (const [label, value] of rows) {
      doc.fontSize(10).fillColor("#555555").text(label, { continued: true, width: 250 })
      doc.fillColor("black").text(`  ${value}`)
    }
    doc.moveDown()
  }

  // ==== PowerPoint =============================================================

  /** Executive presentation: KPI summary, charts (native PowerPoint charts,
   *  not images), workforce trends, performance/leave/recruitment/learning
   *  sections, and key HR insights — matching the spec's content list. */
  async generatePptx(filters: HrAnalyticsFilters, actingEmployeeId: string): Promise<Buffer> {
    const bundle = await this.buildBundle(filters)
    const recruitment = await this.delegated.recruitmentAnalyticsFor(actingEmployeeId)

    const pptx = new PptxGenJS()
    pptx.defineLayout({ name: "A4", width: 10, height: 7.5 })
    pptx.layout = "A4"

    const titleSlide = pptx.addSlide()
    titleSlide.addText("HR Analytics Dashboard", { x: 0.5, y: 2.5, w: 9, h: 1, fontSize: 32, bold: true, color: "0A2647" })
    titleSlide.addText("NCBA Rwanda PeopleSuite — Executive Summary", { x: 0.5, y: 3.4, w: 9, h: 0.5, fontSize: 16, color: "555555" })
    titleSlide.addText(new Date().toLocaleDateString("en-GB", { dateStyle: "long" }), { x: 0.5, y: 4.0, w: 9, h: 0.4, fontSize: 12, color: "888888" })

    const kpiSlide = pptx.addSlide()
    kpiSlide.addText("KPI Summary", { x: 0.4, y: 0.3, fontSize: 22, bold: true, color: "0A2647" })
    kpiSlide.addTable(
      [
        tableRow(["Metric", "Value"]),
        tableRow(["Total Active Staff", String(bundle.totalStaff.activeCount)]),
        tableRow(["New Joiners (period)", String(bundle.totalStaff.newJoined)]),
        tableRow(["Exits (period)", String(bundle.totalStaff.exited)]),
        tableRow(["Average Age", String(bundle.averageAge.overall ?? "N/A")]),
        tableRow(["Attrition Rate", `${bundle.attritionRate.rate}%`]),
        tableRow(["Position Fill Rate", `${bundle.positionFillRate.fillRate}%`]),
        tableRow(["Leave Utilization", `${bundle.leaveUtilization.utilizationPercent}%`]),
      ],
      { x: 0.4, y: 1.0, w: 9, colW: [5, 4], fontSize: 12, border: { type: "solid", color: "CCCCCC", pt: 0.5 } }
    )

    const bandSlide = pptx.addSlide()
    bandSlide.addText("Band Distribution", { x: 0.4, y: 0.3, fontSize: 22, bold: true, color: "0A2647" })
    bandSlide.addChart(
      pptx.ChartType.bar,
      [{ name: "Employees", labels: bundle.bandDistribution.map((b) => b.bandName), values: bundle.bandDistribution.map((b) => b.count) }],
      { x: 0.5, y: 1.0, w: 9, h: 5.5 }
    )

    const deptSlide = pptx.addSlide()
    deptSlide.addText("Workforce Distribution by Department", { x: 0.4, y: 0.3, fontSize: 22, bold: true, color: "0A2647" })
    deptSlide.addChart(
      pptx.ChartType.doughnut,
      [{ name: "Employees", labels: bundle.employeeDistribution.map((d) => d.departmentName), values: bundle.employeeDistribution.map((d) => d.count) }],
      { x: 1.5, y: 1.0, w: 7, h: 5.5 }
    )

    const trendSlide = pptx.addSlide()
    trendSlide.addText("Workforce Trends — Exits by Year", { x: 0.4, y: 0.3, fontSize: 22, bold: true, color: "0A2647" })
    trendSlide.addChart(
      pptx.ChartType.line,
      [{ name: "Exits", labels: bundle.exitSummary.trend.map((t) => String(t.year)), values: bundle.exitSummary.trend.map((t) => t.exits) }],
      { x: 0.5, y: 1.0, w: 9, h: 5.5 }
    )

    const perfSlide = pptx.addSlide()
    perfSlide.addText("Performance Distribution", { x: 0.4, y: 0.3, fontSize: 22, bold: true, color: "0A2647" })
    const perfRows = bundle.performanceDistribution as { label: string; actualPercentage: number }[]
    perfSlide.addChart(pptx.ChartType.bar, [{ name: "% of reviews", labels: perfRows.map((p) => p.label), values: perfRows.map((p) => p.actualPercentage) }], { x: 0.5, y: 1.0, w: 9, h: 5.5 })

    const leaveSlide = pptx.addSlide()
    leaveSlide.addText("Leave & Recruitment & Learning", { x: 0.4, y: 0.3, fontSize: 22, bold: true, color: "0A2647" })
    leaveSlide.addTable(
      [
        tableRow(["Section", "Metric", "Value"]),
        tableRow(["Leave", "Utilization", `${bundle.leaveUtilization.utilizationPercent}%`]),
        tableRow(["Recruitment", "Open Requisitions", String(recruitment.overview.openRequisitions)]),
        tableRow(["Recruitment", "Time to Hire (days)", String(recruitment.timeToHire.averageDays ?? "N/A")]),
        tableRow(["Recruitment", "Offer Acceptance Rate", `${recruitment.offerStats.acceptanceRate ?? "N/A"}%`]),
        tableRow(["Learning", "Completion Rate", `${bundle.learning.trainingCompletionRate}%`]),
        tableRow(["Learning", "AML Compliance", bundle.learning.amlCompletionRate === null ? "Not tracked" : `${bundle.learning.amlCompletionRate}%`]),
      ],
      { x: 0.4, y: 1.0, w: 9, colW: [2.5, 3.5, 3], fontSize: 11, border: { type: "solid", color: "CCCCCC", pt: 0.5 } }
    )

    const insightsSlide = pptx.addSlide()
    insightsSlide.addText("Key HR Insights", { x: 0.4, y: 0.3, fontSize: 22, bold: true, color: "0A2647" })
    insightsSlide.addText(
      this.buildInsights(bundle)
        .map((line) => ({ text: line, options: { bullet: true, breakLine: true } }))
        .flatMap((item) => [item]),
      { x: 0.5, y: 1.1, w: 9, h: 5, fontSize: 14, color: "333333" }
    )

    const output = await pptx.write({ outputType: "nodebuffer" })
    return output as Buffer
  }
}
