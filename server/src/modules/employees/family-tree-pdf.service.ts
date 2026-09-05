import { Injectable } from "@nestjs/common"
import PDFDocument from "pdfkit"

import { PrismaService } from "../../prisma/prisma.service"
import { REPORT_THEME, resolveLogoPath } from "../hr-analytics/report-theme"

import type { EmployeesService } from "./employees.service"

/** Same shape EmployeesService.getFamilyTree()/getAllFamilyTrees() return —
 *  imported as a type only (no runtime dependency between the two services,
 *  both are just injected side-by-side into the controller) so this file
 *  doesn't have to redeclare the tree shape by hand. */
type FamilyTreeData = Awaited<ReturnType<EmployeesService["getFamilyTree"]>>

interface GenerateOptions {
  /** "All active staff (128 employees)" or "Jane Doe (EMP0042)" — printed on
   *  the cover page (bulk) or under the employee's name (single). */
  scopeLabel: string
  actingEmployeeId?: string
}

/**
 * Renders the admin "Family Tree Report" export as a PDF — one page per
 * employee (Parents / Siblings / Spouse / Children / Other), plus a cover
 * page when exporting more than one employee at once. PDFKit has no
 * diagram/tree-drawing primitive, so this is a plain printable listing
 * rather than a redraw of the interactive FamilyTree component's boxes and
 * connector lines (same fidelity trade-off as the HR Statistics Snapshot
 * PDF vs. its on-screen dashboard).
 *
 * IMPORTANT: REPORT_THEME.colors are bare hex strings ("0A2647", no "#")
 * because that's how the HR Analytics exports already store them — but
 * PDFKit's color parser silently no-ops on a bare hex string (confirmed via
 * doc._normalizeColor()), so every use here is prefixed with "#" via hex().
 * The existing HR Analytics PDF/PPTX exports predate this discovery and
 * were left as-is (out of scope of what was asked); don't copy that bug
 * into new code.
 */
@Injectable()
export class FamilyTreePdfService {
  constructor(private readonly prisma: PrismaService) {}

  private hex(color: string): string {
    return `#${color}`
  }

  private formatLabel(value: string): string {
    return value
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  private ageOf(dateOfBirth: Date | string | null): number | null {
    if (!dateOfBirth) return null
    const dob = new Date(dateOfBirth)
    if (Number.isNaN(dob.getTime())) return null
    const ageMs = Date.now() - dob.getTime()
    if (ageMs < 0) return null
    return Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25))
  }

  private memberLine(member: {
    name: string
    relationship: string
    gender: string | null
    dateOfBirth: Date | string | null
    occupation: string | null
    contactNumber: string | null
  }): string {
    const parts = [this.formatLabel(member.relationship)]
    if (member.gender) parts.push(this.formatLabel(member.gender))
    const age = this.ageOf(member.dateOfBirth)
    if (age !== null) parts.push(`${age} yrs`)
    if (member.occupation) parts.push(member.occupation)
    if (member.contactNumber) parts.push(member.contactNumber)
    return `${member.name} — ${parts.join(" · ")}`
  }

  private spouseLine(spouse: { name: string; phone: string | null; dateOfBirth: Date | string | null }): string {
    const parts = ["Spouse"]
    const age = this.ageOf(spouse.dateOfBirth)
    if (age !== null) parts.push(`${age} yrs`)
    if (spouse.phone) parts.push(spouse.phone)
    return `${spouse.name} — ${parts.join(" · ")}`
  }

  private childLine(child: { fullName: string; gender: string; dateOfBirth: Date | string }): string {
    const parts = ["Child", this.formatLabel(child.gender)]
    const age = this.ageOf(child.dateOfBirth)
    if (age !== null) parts.push(`${age} yrs`)
    return `${child.fullName} — ${parts.join(" · ")}`
  }

  private async resolveGeneratedByLabel(actingEmployeeId?: string): Promise<string> {
    if (!actingEmployeeId) return "NCBA Rwanda PeopleSuite"
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNumber: actingEmployeeId },
      select: { firstName: true, lastName: true },
    })
    return employee ? `${employee.firstName} ${employee.lastName}` : "NCBA Rwanda PeopleSuite"
  }

  private renderCover(doc: PDFKit.PDFDocument, count: number, scopeLabel: string, generatedAtLabel: string, generatedByLabel: string) {
    const left = doc.page.margins.left
    const right = doc.page.width - doc.page.margins.right

    doc.rect(0, 0, doc.page.width, 8).fill(this.hex(REPORT_THEME.colors.gold))

    let y = 90
    const logoPath = resolveLogoPath()
    if (logoPath) {
      doc.image(logoPath, left, y, { width: 130 })
      y += 90
    } else {
      doc.roundedRect(left, y, 130, 48, 6).fill(this.hex(REPORT_THEME.colors.navy))
      doc.fillColor("white").fontSize(18).font("Helvetica-Bold").text("NCBA", left, y + 15, { width: 130, align: "center" })
      y += 70
    }

    doc.fillColor(this.hex(REPORT_THEME.colors.muted)).fontSize(10).font("Helvetica").text("PEOPLE & CULTURE · FAMILY TREE REPORT", left, y)
    y += 26

    doc.fillColor(this.hex(REPORT_THEME.colors.navy)).fontSize(26).font("Helvetica-Bold").text("Family Tree Report", left, y, { width: right - left })
    y += 42

    doc.fillColor(this.hex(REPORT_THEME.colors.muted)).fontSize(13).font("Helvetica").text(scopeLabel, left, y, { width: right - left })
    y += 24

    doc
      .moveTo(left, y)
      .lineTo(right, y)
      .lineWidth(1)
      .strokeColor(this.hex(REPORT_THEME.colors.border))
      .stroke()
    y += 20

    doc.fillColor(this.hex(REPORT_THEME.colors.mutedLight)).fontSize(10).font("Helvetica")
    doc.text(`Employees included: ${count}`, left, y)
    y += 16
    doc.text(`Date generated: ${generatedAtLabel}`, left, y)
    y += 16
    doc.text(`Generated by: ${generatedByLabel}`, left, y)
    y += 30

    doc.fillColor(this.hex(REPORT_THEME.colors.brown)).fontSize(9).font("Helvetica-Bold").text("CONFIDENTIAL — INTERNAL USE ONLY", left, doc.page.height - doc.page.margins.bottom - 30)

    doc.fillColor("black").font("Helvetica")
  }

  private renderMemberSection(doc: PDFKit.PDFDocument, title: string, lines: string[]) {
    const left = doc.page.margins.left
    doc.fontSize(12).fillColor(this.hex(REPORT_THEME.colors.navy)).font("Helvetica-Bold").text(title, left, doc.y)
    doc.moveDown(0.25)
    doc.font("Helvetica").fontSize(10).fillColor(this.hex(REPORT_THEME.colors.text))
    for (const line of lines) {
      doc.text(`•  ${line}`, left)
    }
    doc.moveDown(0.6)
    doc.fillColor("black")
  }

  private renderEmployeePage(doc: PDFKit.PDFDocument, tree: FamilyTreeData) {
    const left = doc.page.margins.left
    const right = doc.page.width - doc.page.margins.right

    doc.fontSize(16).fillColor(this.hex(REPORT_THEME.colors.navy)).font("Helvetica-Bold").text(`${tree.employee.firstName} ${tree.employee.lastName}`, left, doc.y)

    const subtitleParts = [tree.employee.id, tree.employee.positionTitle, tree.employee.departmentName].filter(
      (part): part is string => Boolean(part)
    )
    doc.fontSize(10).fillColor(this.hex(REPORT_THEME.colors.muted)).font("Helvetica").text(subtitleParts.join(" · "))
    doc.moveDown(0.3)

    doc
      .moveTo(left, doc.y)
      .lineTo(right, doc.y)
      .lineWidth(1)
      .strokeColor(this.hex(REPORT_THEME.colors.gold))
      .stroke()
    doc.moveDown(0.6)

    const hasSpouse = Boolean(tree.spouse.primary) || tree.spouse.additional.length > 0
    const hasChildren = tree.children.primary.length > 0 || tree.children.additional.length > 0
    const hasAny = tree.parents.length > 0 || tree.siblings.length > 0 || hasSpouse || hasChildren || tree.other.length > 0

    if (!hasAny) {
      doc.fontSize(10).fillColor(this.hex(REPORT_THEME.colors.mutedLight)).font("Helvetica-Oblique").text("No family information on file.")
      doc.fillColor("black").font("Helvetica")
      return
    }

    if (tree.parents.length > 0) {
      this.renderMemberSection(doc, "Parents", tree.parents.map((m) => this.memberLine(m)))
    }
    if (tree.siblings.length > 0) {
      this.renderMemberSection(doc, "Siblings", tree.siblings.map((m) => this.memberLine(m)))
    }
    if (hasSpouse) {
      const lines: string[] = []
      if (tree.spouse.primary) lines.push(this.spouseLine(tree.spouse.primary))
      lines.push(...tree.spouse.additional.map((m) => this.memberLine(m)))
      this.renderMemberSection(doc, "Spouse", lines)
    }
    if (hasChildren) {
      const lines: string[] = []
      lines.push(...tree.children.primary.map((c) => this.childLine(c)))
      lines.push(...tree.children.additional.map((m) => this.memberLine(m)))
      this.renderMemberSection(doc, "Children", lines)
    }
    if (tree.other.length > 0) {
      this.renderMemberSection(doc, "Other Family Members", tree.other.map((m) => this.memberLine(m)))
    }

    doc.fillColor("black").font("Helvetica")
  }

  /** `trees` with exactly one entry renders as a single clean page (no
   *  cover) — used for the admin employee detail page's "Export Family
   *  Tree" button. More than one entry gets a cover page first — used for
   *  the Employees list page's "Export for all staff" bulk action. */
  async generate(trees: FamilyTreeData[], options: GenerateOptions): Promise<Buffer> {
    const generatedByLabel = await this.resolveGeneratedByLabel(options.actingEmployeeId)
    const generatedAtLabel = new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })

    const doc = new PDFDocument({ margin: 50, size: "A4" })
    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))))

    if (trees.length === 0) {
      doc.fontSize(12).fillColor("#333333").text("No employees matched this export.")
      doc.end()
      return done
    }

    if (trees.length > 1) {
      this.renderCover(doc, trees.length, options.scopeLabel, generatedAtLabel, generatedByLabel)
      doc.addPage()
    }

    trees.forEach((tree, index) => {
      if (index > 0) doc.addPage()
      this.renderEmployeePage(doc, tree)
    })

    doc.end()
    return done
  }
}
