/**
 * Structured Job Description content — mirrors the sections of the NCBA
 * master JD template (JD – Bancassurance Officer.docx). Free-text blocks use
 * one line per item: a line starting with "# " is a bold sub-heading, any
 * other line is a bullet. `purpose` is plain paragraphs (one per line).
 */
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
  /** Percentage weighting; all rows should add up to 100. */
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

const EMPTY_HEADER: JdHeader = {
  jobTitle: "",
  reportsTo: "",
  unit: "",
  division: "",
  grade: "",
  date: "",
  jobHolder: "",
  supervisor: "",
}

/** Tolerant parse of whatever is stored in JobDescription.content. */
export function normalizeJdContent(raw: unknown): JdContent {
  const c = (raw && typeof raw === "object" ? raw : {}) as Partial<JdContent>
  const str = (v: unknown) => (typeof v === "string" ? v : "")
  const comps = (v: unknown): JdCompetency[] =>
    Array.isArray(v) ? v.map((x) => ({ name: str((x as JdCompetency)?.name), description: str((x as JdCompetency)?.description) })) : []
  return {
    header: { ...EMPTY_HEADER, ...(c.header ?? {}) },
    purpose: str(c.purpose),
    kras: Array.isArray(c.kras)
      ? c.kras.map((k) => ({ perspective: str(k?.perspective), weighting: Number(k?.weighting) || 0, output: str(k?.output) }))
      : JD_PERSPECTIVES.map((perspective) => ({ perspective, weighting: 0, output: "" })),
    directReports: str(c.directReports) || "None",
    indirectReports: str(c.indirectReports) || "None",
    stakeholdersInternal: str(c.stakeholdersInternal),
    stakeholdersExternal: str(c.stakeholdersExternal),
    decisionAuthority: str(c.decisionAuthority),
    workCycle: str(c.workCycle),
    specifications: str(c.specifications),
    technicalCompetencies: comps(c.technicalCompetencies),
    behaviouralCompetencies: comps(c.behaviouralCompetencies),
  }
}

/** Content for a JD created before the structured editor existed. */
export function contentFromFlat(jd: {
  jobTitle: string
  jobSummary: string
  keyResponsibilities: string
  requiredQualifications: string
  requiredCertifications?: string | null
  requiredExperience?: string | null
  technicalCompetencies?: string | null
  behaviouralCompetencies?: string | null
}): JdContent {
  const comps = (v?: string | null): JdCompetency[] =>
    (v ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const i = l.indexOf(":")
        return i > 0 ? { name: l.slice(0, i).trim(), description: l.slice(i + 1).trim() } : { name: l, description: "" }
      })
  const specs = [
    jd.requiredQualifications ? `# Academic:\n${jd.requiredQualifications}` : "",
    jd.requiredCertifications ? `# Professional:\n${jd.requiredCertifications}` : "",
    jd.requiredExperience ? `# Desired work experience:\n${jd.requiredExperience}` : "",
  ]
    .filter(Boolean)
    .join("\n")
  return normalizeJdContent({
    header: { jobTitle: jd.jobTitle },
    purpose: jd.jobSummary,
    kras: [{ perspective: "Key responsibilities", weighting: 100, output: jd.keyResponsibilities }],
    specifications: specs,
    technicalCompetencies: comps(jd.technicalCompetencies),
    behaviouralCompetencies: comps(jd.behaviouralCompetencies),
  })
}

/** Flat columns kept in sync so postings/search/older screens still work. */
export function flatFromContent(c: JdContent) {
  const list = (s: string) =>
    s
      .split("\n")
      .map((l) => l.replace(/^#\s*/, "").trim())
      .filter(Boolean)
      .join("\n")
  const comps = (cs: JdCompetency[]) => cs.filter((x) => x.name.trim()).map((x) => `${x.name}: ${x.description}`).join("\n")
  return {
    jobTitle: c.header.jobTitle.trim() || "Untitled position",
    jobSummary: c.purpose.trim() || "-",
    keyResponsibilities:
      c.kras
        .filter((k) => k.output.trim())
        .map((k) => `${k.perspective}\n${list(k.output)}`)
        .join("\n\n") || "-",
    requiredQualifications: list(c.specifications) || "-",
    technicalCompetencies: comps(c.technicalCompetencies) || null,
    behaviouralCompetencies: comps(c.behaviouralCompetencies) || null,
  }
}
