import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx"

import type { JdContent } from "./jd-content"
import { JD_LOGO_BASE64 } from "./jd-logo"

/**
 * Renders a JD in the NCBA master template layout: Century Gothic, US Letter,
 * 1" margins, logo header, "Page X of Y JD – Title" footer, bordered tables
 * 9355 DXA wide with E2EFD9 section bars.
 */
const FONT = "Century Gothic"
const SIZE = 20
const GREEN = "E2EFD9"
const W = 9355
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "000000" }
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }

function run(text: string, opts: { bold?: boolean; italics?: boolean } = {}) {
  return new TextRun({ text, font: FONT, size: SIZE, ...opts })
}

function para(text: string, opts: { bold?: boolean; italics?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number } = {}) {
  return new Paragraph({
    alignment: opts.align,
    spacing: { after: opts.after ?? 60 },
    children: [run(text, { bold: opts.bold, italics: opts.italics })],
  })
}

/** Lines → bold "# " headings and bulleted items. */
function blockParagraphs(text: string): Paragraph[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return [para("")]
  return lines.map((line) =>
    line.startsWith("#")
      ? new Paragraph({ spacing: { before: 60, after: 40 }, children: [run(line.replace(/^#+\s*/, ""), { bold: true })] })
      : new Paragraph({ numbering: { reference: "jd-bullets", level: 0 }, spacing: { after: 40 }, children: [run(line)] })
  )
}

function plainParagraphs(text: string): Paragraph[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  return (lines.length ? lines : [""]).map((l) => para(l, { align: AlignmentType.JUSTIFIED, after: 80 }))
}

function cell(children: Paragraph[], width: number, opts: { fill?: string; span?: number; center?: boolean } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    columnSpan: opts.span,
    borders: BORDERS,
    verticalAlign: opts.center ? VerticalAlign.CENTER : VerticalAlign.TOP,
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill, color: "auto" } : undefined,
    margins: { top: 40, bottom: 40, left: 100, right: 100 },
    children,
  })
}

const label = (t: string, w: number) => cell([para(t, { bold: true, after: 0 })], w, { fill: GREEN, center: true })
const value = (t: string, w: number) => cell([para(t, { after: 0 })], w, { center: true })

function table(widths: number[], rows: TableRow[]) {
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: widths, rows })
}

function bar(title: string, bodies: Paragraph[]) {
  return table([W], [
    new TableRow({ children: [cell([para(title, { bold: true, after: 0 })], W, { fill: GREEN })] }),
    new TableRow({ children: [cell(bodies, W)] }),
  ])
}

const spacer = () => new Paragraph({ spacing: { after: 120 }, children: [] })

export async function buildJdDocx(c: JdContent): Promise<Buffer> {
  const h = c.header
  const logo = Buffer.from(JD_LOGO_BASE64, "base64")
  const children: (Paragraph | Table)[] = []

  children.push(
    table([1850, 2825, 1850, 2825], [
      new TableRow({ children: [label("Job Title:", 1850), value(h.jobTitle, 2825), label("Reports to:", 1850), value(h.reportsTo, 2825)] }),
      new TableRow({ children: [label("Unit:", 1850), value(h.unit, 2825), label("Division", 1850), value(h.division, 2825)] }),
      new TableRow({ children: [label("Grade:", 1850), value(h.grade, 2825), label("Date:", 1850), value(h.date, 2825)] }),
      new TableRow({ children: [label("Job holder:", 1850), value(h.jobHolder, 2825), label("Supervisor:", 1850), value(h.supervisor, 2825)] }),
      new TableRow({ children: [label("Signature:", 1850), value("", 2825), label("Signature:", 1850), value("", 2825)] }),
    ]),
    spacer(),
    bar("Job Purpose Statement", plainParagraphs(c.purpose)),
    spacer()
  )

  const total = c.kras.reduce((s, k) => s + (Number(k.weighting) || 0), 0)
  const kraWidths = [2065, 1260, 6030]
  children.push(
    table(kraWidths, [
      new TableRow({ children: [cell([para("Key Result Areas", { bold: true, after: 0 })], W, { fill: GREEN, span: 3 })] }),
      new TableRow({
        children: [
          cell([para("Perspective", { bold: true, after: 0 })], kraWidths[0], { fill: GREEN, center: true }),
          cell(
            [para("% Weighting", { bold: true, after: 0, align: AlignmentType.CENTER }), para("(to add up to 100%)", { italics: true, after: 0, align: AlignmentType.CENTER })],
            kraWidths[1],
            { fill: GREEN, center: true }
          ),
          cell([para("Output", { bold: true, after: 0 })], kraWidths[2], { fill: GREEN, center: true }),
        ],
      }),
      ...c.kras.map(
        (k) =>
          new TableRow({
            cantSplit: false,
            children: [
              cell([para(k.perspective, { bold: true, after: 0 })], kraWidths[0]),
              cell([para(`${k.weighting}%`, { after: 0, align: AlignmentType.CENTER })], kraWidths[1]),
              cell(blockParagraphs(k.output), kraWidths[2]),
            ],
          })
      ),
      new TableRow({
        children: [
          cell([para("Total", { bold: true, after: 0 })], kraWidths[0], { fill: GREEN }),
          cell([para(`${total}%`, { bold: true, after: 0, align: AlignmentType.CENTER })], kraWidths[1], { fill: GREEN }),
          cell([para("", { after: 0 })], kraWidths[2], { fill: GREEN }),
        ],
      }),
    ]),
    spacer()
  )

  const dimWidths = [1705, 7650]
  children.push(
    table(dimWidths, [
      new TableRow({ children: [cell([para("Job Dimensions", { bold: true, after: 0 })], W, { fill: GREEN, span: 2 })] }),
      new TableRow({
        children: [cell([para("Reporting Relationships: jobs that report to this position directly and indirectly", { italics: true, after: 0 })], W, { span: 2 })],
      }),
      new TableRow({ children: [label("Direct Reports", dimWidths[0]), value(c.directReports, dimWidths[1])] }),
      new TableRow({ children: [label("Indirect Reports", dimWidths[0]), value(c.indirectReports, dimWidths[1])] }),
    ]),
    table([4677, 4678], [
      new TableRow({
        children: [
          cell(
            [para("Stakeholder Management: key stakeholders that the position holder will need to liaise/work with to be successful in this role.", { italics: true, after: 0 })],
            W,
            { span: 2 }
          ),
        ],
      }),
      new TableRow({
        children: [
          cell([para("Internal", { bold: true }), ...blockParagraphs(c.stakeholdersInternal)], 4677),
          cell([para("External", { bold: true }), ...blockParagraphs(c.stakeholdersExternal)], 4678),
        ],
      }),
    ]),
    table([W], [
      new TableRow({
        children: [
          cell(
            [para("Decision Making Authority /Mandates/Constraints: the decisions the position holder is empowered to make (Indicate if it is Operational, Managerial or Strategic)", { italics: true, after: 0 })],
            W
          ),
        ],
      }),
      new TableRow({ children: [cell(blockParagraphs(c.decisionAuthority), W)] }),
    ]),
    table([W], [
      new TableRow({
        children: [
          cell(
            [
              para("Work cycle and impact: time horizon and nature of impact (Planning)", { italics: true, after: 0 }),
              para("(e.g. Less than 1 week, 2 weeks, 2 weeks – 1 month, 1month – 3 months, 3-6 months, 6-12 months, above 1 year)", { italics: true, after: 0 }),
            ],
            W
          ),
        ],
      }),
      new TableRow({ children: [cell(blockParagraphs(c.workCycle), W)] }),
    ]),
    spacer(),
    bar("Ideal Job Specifications", blockParagraphs(c.specifications)),
    spacer()
  )

  const compTable = (title: string, items: JdContent["technicalCompetencies"]) =>
    table([2300, 7055], [
      new TableRow({ children: [cell([para(title, { bold: true, after: 0 })], W, { fill: GREEN, span: 2 })] }),
      ...items.map(
        (i) => new TableRow({ children: [cell([para(i.name, { bold: true, after: 0 })], 2300), cell([para(i.description, { after: 0 })], 7055)] })
      ),
    ])
  children.push(compTable("Technical  Competencies", c.technicalCompetencies), spacer(), compTable("Behavioural  Competencies", c.behaviouralCompetencies), spacer())
  children.push(para("This JD is signed-off with reference having been made to the organisation’s core values and aligned competencies against these values.", { italics: true }))

  const doc = new Document({
    creator: "CoreHR",
    title: `JD – ${h.jobTitle}`,
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    numbering: {
      config: [
        {
          reference: "jd-bullets",
          levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }],
        },
      ],
    },
    sections: [
      {
        properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440, header: 360, footer: 720 } } },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 240 },
                children: [new ImageRun({ data: logo, transformation: { width: 202, height: 79 } })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  run("Page "),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SIZE }),
                  run(" of "),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: SIZE }),
                  run(` JD – ${h.jobTitle}`),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })
  return Packer.toBuffer(doc)
}
