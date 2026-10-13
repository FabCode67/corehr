/** Structured JD content (NCBA master template) — mirror of
 *  server/src/modules/recruitment/job-descriptions/jd-content.ts.
 *  Free-text blocks: one line per item; "# " lines are bold sub-headings,
 *  other lines are bullets. Pure module — safe for client components. */
export interface JdHeader {
  jobTitle: string
  reportsTo: string
  unit: string
  division: string
  grade: string
  date: string
  jobHolder: string
  supervisor: string
}
export interface JdKra {
  perspective: string
  weighting: number
  output: string
}
export interface JdCompetency {
  name: string
  description: string
}
export interface JdContent {
  header: JdHeader
  purpose: string
  kras: JdKra[]
  directReports: string
  indirectReports: string
  stakeholdersInternal: string
  stakeholdersExternal: string
  decisionAuthority: string
  workCycle: string
  specifications: string
  technicalCompetencies: JdCompetency[]
  behaviouralCompetencies: JdCompetency[]
}

export const JD_PERSPECTIVES = ["Financial", "Customer", "Internal business processes", "Learning and growth"]

export function emptyJdContent(header: Partial<JdHeader> = {}): JdContent {
  return {
    header: { jobTitle: "", reportsTo: "", unit: "", division: "", grade: "", date: "", jobHolder: "", supervisor: "", ...header },
    purpose: "",
    kras: JD_PERSPECTIVES.map((perspective, i) => ({ perspective, weighting: [35, 30, 25, 10][i], output: "" })),
    directReports: "None",
    indirectReports: "None",
    stakeholdersInternal: "",
    stakeholdersExternal: "",
    decisionAuthority: "",
    workCycle: "",
    specifications: "# Academic:\n\n# Professional:\n\n# Desired work experience:\n",
    technicalCompetencies: [{ name: "", description: "" }],
    behaviouralCompetencies: [
      { name: "", description: "" },
      { name: "NCBA Values", description: "Driven, Open, Responsive and Trusted in all interactions." },
    ],
  }
}

export function splitLines(text: string): string[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean)
}
