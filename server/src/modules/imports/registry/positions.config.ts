import type { Prisma } from "@prisma/client"

import type { ImportContext, ImportDeps, ImportModuleConfig, ImportRowResult, ImportTemplateColumn } from "./types"
import { isBlank, normalizeString, requireField, rowFingerprint } from "../validators.util"

/**
 * "Function" isn't in the spec's field list but is added here for the same
 * reason as the Employee and Department imports: Department.name is only
 * unique per Function (@@unique([functionId, name])), so resolving a
 * Department by name alone is ambiguous without it. "Grade" maps to
 * PositionLevel — Position has no bandId of its own (Band lives on
 * Employee/PositionHistory only); levelId is Position's one required rank
 * field, so that's what "Grade" resolves against here.
 */
const COLUMNS: ImportTemplateColumn[] = [
  { key: "code", header: "Position Code", required: true, example: "POS-HR-001" },
  { key: "name", header: "Position Name", required: true, example: "HR Officer" },
  { key: "function", header: "Function", required: true, example: "Corporate Services" },
  { key: "department", header: "Department", required: true, example: "Human Resources" },
  { key: "grade", header: "Grade", required: true, example: "Officer", description: "Maps to Position Level." },
  { key: "reportingPosition", header: "Reporting Position", required: false, example: "HR Manager", description: "Position Code or Position Name of who this position reports to." },
]

async function buildContext(deps: ImportDeps): Promise<ImportContext> {
  const { prisma } = deps
  const [functions, departments, levels, positions] = await Promise.all([
    prisma.function.findMany({ select: { id: true, name: true } }),
    prisma.department.findMany({ select: { id: true, name: true, functionId: true } }),
    prisma.positionLevel.findMany({ select: { id: true, name: true } }),
    prisma.position.findMany({ select: { id: true, code: true, title: true, departmentId: true } }),
  ])
  return {
    functions,
    departments,
    levels,
    positions,
    positionsByCode: new Map(positions.filter((p) => p.code).map((p) => [p.code as string, p])),
  }
}

function validateRow(raw: Record<string, string>, rowNumber: number, ctx: ImportContext, seen: Set<string>): ImportRowResult {
  const errors: string[] = []
  const functions = ctx.functions as { id: string; name: string }[]
  const departments = ctx.departments as { id: string; name: string; functionId: string }[]
  const levels = ctx.levels as { id: string; name: string }[]
  const positions = ctx.positions as { id: string; code: string | null; title: string; departmentId: string }[]
  const positionsByCode = ctx.positionsByCode as Map<string, { id: string }>

  for (const label of ["Position Code", "Position Name", "Function", "Department", "Grade"]) {
    const error = requireField(raw[label], label)
    if (error) errors.push(error)
  }

  const code = normalizeString(raw["Position Code"])
  const existing = code ? positionsByCode.get(code) : undefined

  let departmentId: string | undefined
  if (!isBlank(raw["Function"]) && !isBlank(raw["Department"])) {
    const fn = functions.find((f) => f.name.toLowerCase() === raw["Function"].toLowerCase())
    if (!fn) {
      errors.push(`Function "${raw["Function"]}" does not exist.`)
    } else {
      const department = departments.find((d) => d.functionId === fn.id && d.name.toLowerCase() === raw["Department"].toLowerCase())
      if (!department) errors.push(`Department "${raw["Department"]}" does not exist under Function "${raw["Function"]}".`)
      else departmentId = department.id
    }
  }

  let levelId: string | undefined
  if (!isBlank(raw["Grade"])) {
    const level = levels.find((l) => l.name.toLowerCase() === raw["Grade"].toLowerCase())
    if (!level) errors.push(`Grade "${raw["Grade"]}" does not exist as a Position Level.`)
    else levelId = level.id
  }

  let reportsToPositionId: string | undefined
  if (!isBlank(raw["Reporting Position"])) {
    const candidate = raw["Reporting Position"].trim()
    const byCode = positionsByCode.get(candidate)
    const byTitle = positions.find((p) => p.title.toLowerCase() === candidate.toLowerCase())
    const match = byCode ?? byTitle
    if (!match) errors.push(`Reporting Position "${candidate}" does not exist.`)
    else reportsToPositionId = match.id
  }

  const fingerprint = rowFingerprint(code)
  const isDuplicateInFile = code ? seen.has(fingerprint) : false
  if (code) seen.add(fingerprint)

  const data = {
    code,
    title: normalizeString(raw["Position Name"]),
    departmentId,
    levelId,
    reportsToPositionId,
  }

  const status: ImportRowResult["status"] = errors.length > 0 ? "invalid" : isDuplicateInFile ? "duplicate" : existing ? "updated" : "new"
  return { row: rowNumber, status, data, errors }
}

async function applyRow(row: ImportRowResult, tx: Prisma.TransactionClient) {
  const data = row.data as { code: string; title: string; departmentId: string; levelId: string; reportsToPositionId?: string }
  await tx.position.upsert({
    where: { code: data.code },
    create: { code: data.code, title: data.title, departmentId: data.departmentId, levelId: data.levelId, reportsToPositionId: data.reportsToPositionId },
    update: { title: data.title, departmentId: data.departmentId, levelId: data.levelId, reportsToPositionId: data.reportsToPositionId },
  })
  return { action: row.status === "new" ? ("created" as const) : ("updated" as const), employeeNumber: undefined }
}

export const positionsImportConfig: ImportModuleConfig = {
  key: "positions",
  label: "Positions",
  referenceKeyLabel: "Position Code",
  matchStrategy: "codeUpdate",
  columns: COLUMNS,
  buildContext,
  validateRow,
  applyRow,
}
