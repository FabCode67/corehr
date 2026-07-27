import { Injectable } from "@nestjs/common"

import PDFDocument from "pdfkit"

/** Minimal shape this service needs from a FormInstance — matches
 *  FORM_INSTANCE_INCLUDE in FormInstancesService, kept loose here so this
 *  module doesn't need to import that service's private include type. */
interface PdfFormInstance {
  id: string
  status: string
  formVersion: number
  assignmentDate: Date
  dueDate: Date | null
  submittedAt: Date | null
  completedAt: Date | null
  instructions: string | null
  formTemplate: {
    title: string
    formCode: string
    description: string
    category: { name: string }
    fields: { id: string; label: string; fieldType: string; isRequired: boolean }[]
  }
  employee: { employeeNumber: string; firstName: string; lastName: string }
  assignedBy: { employeeNumber: string; firstName: string; lastName: string }
  responses: { formFieldId: string; value: unknown }[]
  signatures: {
    status: string
    signedAt: Date | null
    comments: string | null
    formSignatureStage: { stageOrder: number; role: string; label: string | null }
    signer: { employeeNumber: string; firstName: string; lastName: string } | null
  }[]
}

/**
 * Renders a single completed (or in-progress) FormInstance as a PDF — the
 * "download as PDF" record the spec asks for. This pass only supports a
 * per-instance PDF, not the aggregate Excel/CSV/PowerPoint report files
 * described in the spec (see reports-scope decision in schema.prisma).
 */
@Injectable()
export class FormPdfService {
  async generate(instance: PdfFormInstance): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50, size: "A4" })
    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))))

    this.renderHeader(doc, instance)
    this.renderMeta(doc, instance)
    this.renderFields(doc, instance)
    this.renderSignatures(doc, instance)

    doc.end()
    return done
  }

  private renderHeader(doc: PDFKit.PDFDocument, instance: PdfFormInstance) {
    doc.fontSize(18).text(instance.formTemplate.title, { align: "left" })
    doc.fontSize(10).fillColor("#555555").text(`${instance.formTemplate.formCode} · v${instance.formVersion} · ${instance.formTemplate.category.name}`)
    doc.fillColor("black").moveDown()
    if (instance.formTemplate.description) {
      doc.fontSize(10).fillColor("#333333").text(instance.formTemplate.description)
      doc.fillColor("black")
    }
    doc.moveDown()
  }

  private renderMeta(doc: PDFKit.PDFDocument, instance: PdfFormInstance) {
    const employeeName = `${instance.employee.firstName} ${instance.employee.lastName} (${instance.employee.employeeNumber})`
    const assignedByName = `${instance.assignedBy.firstName} ${instance.assignedBy.lastName} (${instance.assignedBy.employeeNumber})`

    doc.fontSize(11).text(`Status: ${instance.status}`)
    doc.text(`Employee: ${employeeName}`)
    doc.text(`Assigned by: ${assignedByName}`)
    doc.text(`Assigned on: ${formatDate(instance.assignmentDate)}`)
    if (instance.dueDate) doc.text(`Due: ${formatDate(instance.dueDate)}`)
    if (instance.submittedAt) doc.text(`Submitted: ${formatDate(instance.submittedAt)}`)
    if (instance.completedAt) doc.text(`Completed: ${formatDate(instance.completedAt)}`)
    if (instance.instructions) doc.text(`Instructions: ${instance.instructions}`)
    doc.moveDown()
  }

  private renderFields(doc: PDFKit.PDFDocument, instance: PdfFormInstance) {
    doc.fontSize(13).text("Form Responses", { underline: true })
    doc.moveDown(0.5)

    const responseByFieldId = new Map(instance.responses.map((response) => [response.formFieldId, response.value]))
    for (const field of instance.formTemplate.fields) {
      const value = responseByFieldId.get(field.id)
      doc.fontSize(10).fillColor("#555555").text(`${field.label}${field.isRequired ? " *" : ""}`)
      doc.fontSize(11).fillColor("black").text(formatFieldValue(value))
      doc.moveDown(0.4)
    }
    doc.moveDown()
  }

  private renderSignatures(doc: PDFKit.PDFDocument, instance: PdfFormInstance) {
    doc.fontSize(13).text("Signatures", { underline: true })
    doc.moveDown(0.5)

    const sorted = [...instance.signatures].sort((a, b) => a.formSignatureStage.stageOrder - b.formSignatureStage.stageOrder)
    for (const signature of sorted) {
      const stageName = signature.formSignatureStage.label ?? signature.formSignatureStage.role
      const signerName = signature.signer ? `${signature.signer.firstName} ${signature.signer.lastName} (${signature.signer.employeeNumber})` : "Not yet assigned"
      doc.fontSize(10).fillColor("#555555").text(`Stage ${signature.formSignatureStage.stageOrder} · ${stageName}`)
      doc.fontSize(11).fillColor("black").text(`${signerName} — ${signature.status}${signature.signedAt ? ` on ${formatDate(signature.signedAt)}` : ""}`)
      if (signature.comments) {
        doc.fontSize(10).fillColor("#333333").text(`Comments: ${signature.comments}`)
        doc.fillColor("black")
      }
      doc.moveDown(0.4)
    }
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—"
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item !== "object" || item === null)) return value.join(", ")
    return value.map((row) => Object.entries(row as Record<string, unknown>).map(([key, val]) => `${key}: ${val}`).join(", ")).join(" | ")
  }
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}
