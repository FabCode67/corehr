import { Injectable } from "@nestjs/common"

import PDFDocument from "pdfkit"

/** Loosely typed to whatever ExecutiveDashboardService.getOverview()
 *  returns — this service just renders it, it doesn't own the shape.
 *  Mirrors FormPdfService's approach of accepting a plain object rather
 *  than importing the other service's private return type. */
type DashboardOverview = Awaited<ReturnType<import("./executive-dashboard.service").ExecutiveDashboardService["getOverview"]>>

/**
 * Renders the Executive Dashboard overview as a single-snapshot PDF — the
 * "export to PDF" scope decided for this feature (on-screen dashboards +
 * PDF only, no aggregate Excel/CSV/PowerPoint report files — same scope
 * decision as FormPdfService/CasePdfService took for their areas).
 */
@Injectable()
export class ExecutiveDashboardPdfService {
  async generate(overview: DashboardOverview): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50, size: "A4" })
    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))))

    doc.fontSize(18).text("Executive Dashboard", { align: "left" })
    doc.fontSize(10).fillColor("#555555").text(`Generated ${formatDate(overview.generatedAt)}`)
    doc.fillColor("black").moveDown()

    this.section(doc, "Employee Overview", [
      ["Total employees", overview.employees.totalEmployees],
      ["Active employees", overview.employees.activeEmployees],
      ["Employees exiting", overview.employees.exitingEmployees],
      ["Exited employees", overview.employees.exitedEmployees],
      ["New joiners (30 days)", overview.employees.newJoinersLast30Days],
      ["New joiners (90 days)", overview.employees.newJoinersLast90Days],
    ])

    this.section(doc, "Recruitment", [
      ["Open requisitions", overview.recruitment.openRequisitions],
      ["Active applications", overview.recruitment.activeApplications],
      ["Interviews this week", overview.recruitment.interviewsThisWeek],
      ["Pending offers", overview.recruitment.pendingOffers],
      ["Hires this month", overview.recruitment.hiresThisMonth],
    ])

    this.section(doc, "Learning & Development", [
      ["Course completion rate", formatPercent(overview.learning.courseCompletionRate)],
      ["Mandatory training compliance", formatPercent(overview.learning.mandatoryTrainingCompliance)],
      ["Overdue mandatory training", overview.learning.overdueMandatoryTraining],
      ["AML compliance", overview.learning.amlCompliance.compliancePercent === null ? "Not tracked (no AML course found)" : `${overview.learning.amlCompliance.compliancePercent}% (${overview.learning.amlCompliance.completed}/${overview.learning.amlCompliance.totalAssigned})`],
    ])

    this.section(doc, "Performance", [
      ["Employees rated", overview.performance.bellCurveDistribution.reduce((sum, r) => sum + r.count, 0)],
      ["Top performers tracked", overview.performance.topPerformers.length],
      ["Years of trend data", overview.performance.trends.length],
    ])

    this.section(doc, "Leave Management", [
      ["Employees currently on leave", overview.leave.employeesCurrentlyOnLeave],
      ["Leave days taken (this year)", overview.leave.leaveUtilizationDays],
      ["Carry-forward balance (org-wide)", overview.leave.carryForwardBalanceTotal],
    ])

    this.section(doc, "Employee Relations", [
      ["Active disciplinary cases", overview.employeeRelations.activeDisciplinaryCases],
      ["Total cases", overview.employeeRelations.totalCases ?? "—"],
      ["Cases under investigation", overview.employeeRelations.underInvestigation ?? "—"],
      ["Appeals pending", overview.employeeRelations.appealsPending ?? "—"],
    ])

    this.section(doc, "Onboarding", [
      ["Employees with outstanding documents", overview.onboarding.employeesWithOutstandingDocuments],
      ["Onboarding completion rate", formatPercent(overview.onboarding.onboardingCompletionRate)],
    ])

    this.section(doc, "Compliance", [
      ["Expired certifications", overview.compliance.expiredCertificationsTracked ? (overview.compliance.expiredCertifications ?? "Not tracked") : "Not tracked"],
      ["Overdue mandatory training", overview.compliance.overdueMandatoryTraining],
      ["Outstanding employee documents", overview.compliance.outstandingEmployeeDocuments],
    ])

    doc.end()
    return done
  }

  private section(doc: PDFKit.PDFDocument, title: string, rows: [string, string | number][]) {
    doc.fontSize(13).fillColor("black").text(title, { underline: true })
    doc.moveDown(0.4)
    for (const [label, value] of rows) {
      doc.fontSize(10).fillColor("#555555").text(label, { continued: true })
      doc.fillColor("black").text(`   ${value}`)
    }
    doc.moveDown()
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value}%`
}
