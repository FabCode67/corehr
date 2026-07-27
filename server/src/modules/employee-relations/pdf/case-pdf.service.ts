import { Injectable } from "@nestjs/common"

import PDFDocument from "pdfkit"

interface PdfEmployeeRef {
  employeeNumber: string
  firstName: string
  lastName: string
}

/** Minimal shape this service needs — matches CASE_INCLUDE in
 *  DisciplinaryCasesService, kept loose here the same way FormPdfService
 *  decouples from FormInstancesService's private include type. */
interface PdfDisciplinaryCase {
  caseNumber: string
  dateReported: Date
  incidentDate: Date
  incidentLocation: string | null
  category: string
  subject: string
  description: string
  witnesses: string[]
  status: string
  isConfidential: boolean
  closedAt: Date | null
  employee: PdfEmployeeRef & { position: { title: string; department: { name: string }; unit: { name: string } | null } | null; branch: { name: string } | null }
  reportedBy: PdfEmployeeRef
  investigations: {
    investigator: PdfEmployeeRef
    startDate: Date
    endDate: Date | null
    status: string
    summary: string | null
    findings: string | null
    recommendation: string | null
  }[]
  sanctions: {
    sanctionType: { name: string }
    dateOfSanction: Date
    effectiveDate: Date
    reason: string
    issuedBy: PdfEmployeeRef
    approvalAuthority: PdfEmployeeRef | null
    comments: string | null
  }[]
  appeals: {
    appealDate: Date
    appealReason: string
    status: string
    outcome: string | null
    decisionDate: Date | null
    decisionComments: string | null
    decidedBy: PdfEmployeeRef | null
  }[]
}

/**
 * Renders one disciplinary case's full record — case details, investigation
 * history, sanctions, and appeals — as a PDF. This pass only supports a
 * per-case PDF, not the aggregate Excel/CSV/PowerPoint report files the
 * spec describes (see reports-scope decision in schema.prisma).
 */
@Injectable()
export class CasePdfService {
  async generate(disciplinaryCase: PdfDisciplinaryCase): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50, size: "A4" })
    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))))

    this.renderHeader(doc, disciplinaryCase)
    this.renderCaseDetails(doc, disciplinaryCase)
    this.renderInvestigations(doc, disciplinaryCase)
    this.renderSanctions(doc, disciplinaryCase)
    this.renderAppeals(doc, disciplinaryCase)

    doc.end()
    return done
  }

  private renderHeader(doc: PDFKit.PDFDocument, disciplinaryCase: PdfDisciplinaryCase) {
    doc.fontSize(18).text(`Disciplinary Case ${disciplinaryCase.caseNumber}`)
    doc.fontSize(10).fillColor("#555555").text(`Status: ${disciplinaryCase.status}${disciplinaryCase.isConfidential ? " · CONFIDENTIAL" : ""}`)
    doc.fillColor("black").moveDown()
  }

  private renderCaseDetails(doc: PDFKit.PDFDocument, disciplinaryCase: PdfDisciplinaryCase) {
    const employeeName = `${disciplinaryCase.employee.firstName} ${disciplinaryCase.employee.lastName} (${disciplinaryCase.employee.employeeNumber})`
    const reportedByName = `${disciplinaryCase.reportedBy.firstName} ${disciplinaryCase.reportedBy.lastName}`

    doc.fontSize(13).text("Case Details", { underline: true })
    doc.moveDown(0.3)
    doc.fontSize(11).text(`Employee: ${employeeName}`)
    doc.text(`Position: ${disciplinaryCase.employee.position?.title ?? "—"}`)
    doc.text(`Department: ${disciplinaryCase.employee.position?.department.name ?? "—"}`)
    doc.text(`Branch: ${disciplinaryCase.employee.branch?.name ?? "—"}`)
    doc.text(`Reported by: ${reportedByName} on ${formatDate(disciplinaryCase.dateReported)}`)
    doc.text(`Incident date: ${formatDate(disciplinaryCase.incidentDate)}${disciplinaryCase.incidentLocation ? ` at ${disciplinaryCase.incidentLocation}` : ""}`)
    doc.text(`Category: ${disciplinaryCase.category}`)
    doc.text(`Subject: ${disciplinaryCase.subject}`)
    doc.moveDown(0.3)
    doc.fontSize(10).fillColor("#555555").text("Description")
    doc.fontSize(11).fillColor("black").text(disciplinaryCase.description)
    if (disciplinaryCase.witnesses.length > 0) {
      doc.moveDown(0.3)
      doc.fontSize(10).fillColor("#555555").text(`Witnesses: ${disciplinaryCase.witnesses.join(", ")}`)
      doc.fillColor("black")
    }
    if (disciplinaryCase.closedAt) {
      doc.text(`Closed: ${formatDate(disciplinaryCase.closedAt)}`)
    }
    doc.moveDown()
  }

  private renderInvestigations(doc: PDFKit.PDFDocument, disciplinaryCase: PdfDisciplinaryCase) {
    if (disciplinaryCase.investigations.length === 0) return
    doc.fontSize(13).text("Investigations", { underline: true })
    doc.moveDown(0.3)
    for (const investigation of disciplinaryCase.investigations) {
      doc.fontSize(10).fillColor("#555555").text(`Investigator: ${investigation.investigator.firstName} ${investigation.investigator.lastName} · ${investigation.status}`)
      doc.fontSize(11).fillColor("black").text(`${formatDate(investigation.startDate)} – ${investigation.endDate ? formatDate(investigation.endDate) : "ongoing"}`)
      if (investigation.summary) doc.text(`Summary: ${investigation.summary}`)
      if (investigation.findings) doc.text(`Findings: ${investigation.findings}`)
      if (investigation.recommendation) doc.text(`Recommendation: ${investigation.recommendation}`)
      doc.moveDown(0.4)
    }
    doc.moveDown(0.3)
  }

  private renderSanctions(doc: PDFKit.PDFDocument, disciplinaryCase: PdfDisciplinaryCase) {
    if (disciplinaryCase.sanctions.length === 0) return
    doc.fontSize(13).text("Sanctions", { underline: true })
    doc.moveDown(0.3)
    for (const sanction of disciplinaryCase.sanctions) {
      doc.fontSize(11).fillColor("black").text(`${sanction.sanctionType.name} — effective ${formatDate(sanction.effectiveDate)}`)
      doc.fontSize(10).fillColor("#555555").text(`Issued by ${sanction.issuedBy.firstName} ${sanction.issuedBy.lastName} on ${formatDate(sanction.dateOfSanction)}${sanction.approvalAuthority ? ` · Approved by ${sanction.approvalAuthority.firstName} ${sanction.approvalAuthority.lastName}` : ""}`)
      doc.fontSize(11).fillColor("black").text(`Reason: ${sanction.reason}`)
      if (sanction.comments) doc.text(`Comments: ${sanction.comments}`)
      doc.moveDown(0.4)
    }
    doc.moveDown(0.3)
  }

  private renderAppeals(doc: PDFKit.PDFDocument, disciplinaryCase: PdfDisciplinaryCase) {
    if (disciplinaryCase.appeals.length === 0) return
    doc.fontSize(13).text("Appeals", { underline: true })
    doc.moveDown(0.3)
    for (const appeal of disciplinaryCase.appeals) {
      doc.fontSize(11).fillColor("black").text(`Filed ${formatDate(appeal.appealDate)} — ${appeal.status}`)
      doc.fontSize(10).fillColor("#555555").text(`Reason: ${appeal.appealReason}`)
      if (appeal.outcome) {
        doc.fontSize(11).fillColor("black").text(`Outcome: ${appeal.outcome}${appeal.decisionDate ? ` on ${formatDate(appeal.decisionDate)}` : ""}${appeal.decidedBy ? ` by ${appeal.decidedBy.firstName} ${appeal.decidedBy.lastName}` : ""}`)
        if (appeal.decisionComments) doc.text(`Decision comments: ${appeal.decisionComments}`)
      }
      doc.moveDown(0.4)
    }
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
}
