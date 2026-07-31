import { join } from "node:path"

import { Injectable } from "@nestjs/common"

import PDFDocument from "pdfkit"

// The cursive script used for the "DocuSigned by:" style stamp below —
// mirrors client/components/ui/signature-stamp.tsx (Alex Brush) so a signed
// form looks the same on screen and in the downloaded PDF. Shipped as a
// static asset copied to dist by nest-cli.json's "assets" config.
const SIGNATURE_FONT_PATH = join(__dirname, "fonts", "AlexBrush-Regular.woff2")
const SIGNATURE_FONT_NAME = "SignatureScript"

/** Mirrors client/components/ui/signature-stamp.tsx's signatureReference(). */
function signatureReference(id: string): string {
  const stripped = id.replaceAll("-", "").toUpperCase()
  return `${stripped.slice(0, 14)}…`
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

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
    id: string
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

    // registerFont() just records the path lazily — it doesn't read the
    // file yet, so it can't throw here. If the font asset is ever missing,
    // the actual failure surfaces the first time doc.font(name) is called
    // in renderSignatureStamp(), which is wrapped in its own try/catch.
    doc.registerFont(SIGNATURE_FONT_NAME, SIGNATURE_FONT_PATH)

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
    doc.font("Helvetica").fontSize(13).fillColor("black").text("Signatures", { underline: true })
    doc.moveDown(0.5)

    const sorted = [...instance.signatures].sort((a, b) => a.formSignatureStage.stageOrder - b.formSignatureStage.stageOrder)
    for (const signature of sorted) {
      const stageName = signature.formSignatureStage.label ?? signature.formSignatureStage.role
      doc.font("Helvetica").fontSize(10).fillColor("#555555").text(`Stage ${signature.formSignatureStage.stageOrder} · ${stageName}`)
      doc.moveDown(0.2)

      if (signature.status === "SIGNED" && signature.signer) {
        this.renderSignatureStamp(doc, { id: signature.id, signer: signature.signer })
      } else {
        const signerName = signature.signer ? `${signature.signer.firstName} ${signature.signer.lastName} (${signature.signer.employeeNumber})` : "Not yet assigned"
        doc.font("Helvetica").fontSize(11).fillColor("black").text(`${signerName} — ${signature.status}${signature.signedAt ? ` on ${formatDate(signature.signedAt)}` : ""}`)
      }

      if (signature.comments) {
        doc.font("Helvetica").fontSize(10).fillColor("#333333").text(`Comments: ${signature.comments}`)
        doc.fillColor("black")
      }
      doc.moveDown(0.5)
    }
  }

  // Cached after the first attempt so a missing/corrupt font asset only
  // costs one failed load per process, not one per stamp rendered.
  private signatureFontAvailable: boolean | null = null

  private useSignatureFont(doc: PDFKit.PDFDocument) {
    if (this.signatureFontAvailable !== false) {
      try {
        doc.font(SIGNATURE_FONT_NAME)
        this.signatureFontAvailable = true
        return
      } catch {
        this.signatureFontAvailable = false
      }
    }
    doc.font("Times-Italic")
  }

  /**
   * Renders a signed signature as a DocuSign-style stamp — "DocuSigned by:"
   * label, the signer's name in a cursive script, a small initials box, and
   * a reference id — matching client/components/ui/signature-stamp.tsx so
   * the on-screen and downloaded-PDF signatures look the same.
   */
  private renderSignatureStamp(doc: PDFKit.PDFDocument, signature: { id: string; signer: { firstName: string; lastName: string } }) {
    const name = `${signature.signer.firstName} ${signature.signer.lastName}`
    const initials = initialsOf(name)
    const reference = signatureReference(signature.id)

    const startX = doc.x
    const startY = doc.y
    const boxWidth = 260
    const boxHeight = 56
    const initialsBoxSize = 28

    doc.lineWidth(0.75).strokeColor("#0A2647")
    doc.rect(startX, startY, boxWidth, boxHeight).stroke()

    doc.font("Helvetica-Bold").fontSize(7).fillColor("#333333")
    doc.text("DocuSigned by:", startX + 8, startY + 6, { lineBreak: false })

    this.useSignatureFont(doc)
    doc.fontSize(22).fillColor("black")
    doc.text(name, startX + 8, startY + 15, { width: boxWidth - initialsBoxSize - 24, height: 26, lineBreak: false })

    doc.font("Helvetica").fontSize(6.5).fillColor("#777777")
    doc.text(reference, startX + 8, startY + boxHeight - 13, { lineBreak: false })

    const initX = startX + boxWidth - initialsBoxSize - 8
    const initY = startY + 12
    doc.lineWidth(1).strokeColor("#0A2647")
    doc.rect(initX, initY, initialsBoxSize, initialsBoxSize).stroke()
    doc.font("Helvetica-Bold").fontSize(6).fillColor("#0A2647")
    doc.text("DS", initX + initialsBoxSize - 11, initY - 7, { lineBreak: false })

    this.useSignatureFont(doc)
    doc.fontSize(13).fillColor("black")
    doc.text(initials, initX, initY + 7, { width: initialsBoxSize, align: "center", lineBreak: false })

    doc.font("Helvetica").fillColor("black")
    doc.x = startX
    doc.y = startY + boxHeight + 6
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
