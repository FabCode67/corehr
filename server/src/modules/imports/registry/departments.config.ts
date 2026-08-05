import type { Prisma } from "@prisma/client"

import type { ImportContext, ImportDeps, ImportModuleConfig, ImportRowResult, ImportTemplateColumn } from "./types"
import { isBlank, normalizeString, requireField, rowFingerprint } from "../validators.util"

/**
 * Function and Parent Department are two separate, independent columns:
 *   - Function is this schema's one required grouping directly above
 *     Department (org chart, dashboards, and every other module key off
 *     this) — was previously mislabeled "Parent Department" in this
 *     template, which conflated the two.
 *   - Parent Department is a genuine, optional Department-to-Department
 *     hierarchy (see Department.parentDepartmentId's schema doc comment) —
 *     referenced by the other department's Code (the same natural key this
 *     module already matches rows on), since Department names are only
 *     unique per-Function, not globally. Scope: import + storage + the
 *     department admin page only, same as everywhere else this field is
 *     touched — org chart/dashboards/filters stay Function-based.
 *     Only resolves against departments that already exist in the
 *     database (this module's buildContext snapshot) — a parent department
 *     created earlier in the very same uploaded file isn't visible yet, so
 *     a hierarchy spanning multiple new rows needs two upload passes.
 */
const COLUMNS: ImportTemplateColumn[] = [
  { key: "code", header: "Department Code", required: true, example: "HR" },
  { key: "name", header: "Department Name", required: true, example: "Human Resources" },
  { key: "function", header: "Function", required: true, example: "Corporate Services", description: "This schema's grouping directly above Department." },
  {
    key: "parentDepartment",
    header: "Parent Department",
    required: false,
    example: "CORP-SVC",
    description: "Optional Department-to-Department hierarchy — the other department's Department Code. Must already exist.",
  },
  { key: "headOfDepartment", header: "Head of Department", required: false, example: "EMP-0001", description: "Employee Number of the department head." },
]

async function buildContext(deps: ImportDeps): Promise<ImportContext> {
  const { prisma } = deps
  const [functions, departments, employees] = await Promise.all([
    prisma.function.findMany({ select: { id: true, name: true } }),
    prisma.department.findMany({ select: { id: true, code: true, functionId: true, parentDepartmentId: true } }),
    prisma.employee.findMany({ select: { employeeNumber: true } }),
  ])
  return {
    functions,
    departmentsByCode: new Map(departments.filter((d) => d.code).map((d) => [d.code as string, d])),
    departmentsById: new Map(departments.map((d) => [d.id, d])),
    existingEmployeeNumbers: new Set(employees.map((e) => e.employeeNumber)),
  }
}

/** Walks the candidate parent's own ancestor chain looking for `ownCode` —
 *  mirrors DepartmentsService.assertParentDepartmentValid()'s cycle check,
 *  duplicated here since the import path validates against an in-memory
 *  buildContext snapshot rather than making its own DB round-trips per row. */
function wouldCreateCycle(
  departmentsById: Map<string, { id: string; code: string | null; parentDepartmentId: string | null }>,
  ownCode: string,
  parentId: string
): boolean {
  const seen = new Set<string>([parentId])
  let cursor = departmentsById.get(parentId)?.parentDepartmentId ?? null
  while (cursor) {
    const ancestor = departmentsById.get(cursor)
    if (!ancestor) break
    if (ancestor.code === ownCode) return true
    if (seen.has(cursor)) break
    seen.add(cursor)
    cursor = ancestor.parentDepartmentId
  }
  return false
}

function validateRow(raw: Record<string, string>, rowNumber: number, ctx: ImportContext, seen: Set<string>): ImportRowResult {
  const errors: string[] = []
  const functions = ctx.functions as { id: string; name: string }[]
  const departmentsByCode = ctx.departmentsByCode as Map<string, { id: string; functionId: string }>
  const departmentsById = ctx.departmentsById as Map<string, { id: string; code: string | null; parentDepartmentId: string | null }>
  const existingEmployeeNumbers = ctx.existingEmployeeNumbers as Set<string>

  for (const label of ["Department Code", "Department Name", "Function"]) {
    const error = requireField(raw[label], label)
    if (error) errors.push(error)
  }

  const code = normalizeString(raw["Department Code"])
  const existing = code ? departmentsByCode.get(code) : undefined

  let functionId: string | undefined
  if (!isBlank(raw["Function"])) {
    const fn = functions.find((f) => f.name.toLowerCase() === raw["Function"].toLowerCase())
    if (!fn) errors.push(`Function "${raw["Function"]}" does not exist.`)
    else functionId = fn.id
  }

  let parentDepartmentId: string | undefined
  if (!isBlank(raw["Parent Department"])) {
    const parentCode = raw["Parent Department"].trim()
    if (code && parentCode.toLowerCase() === code.toLowerCase()) {
      errors.push("Parent Department cannot be the department's own Department Code.")
    } else {
      const parent = departmentsByCode.get(parentCode)
      if (!parent) {
        errors.push(`Parent Department "${parentCode}" does not correspond to an existing Department Code.`)
      } else if (code && wouldCreateCycle(departmentsById, code, parent.id)) {
        errors.push(`Parent Department "${parentCode}" would create a circular department hierarchy.`)
      } else {
        parentDepartmentId = parent.id
      }
    }
  }

  let headOfDepartmentId: string | undefined
  if (!isBlank(raw["Head of Department"])) {
    const candidate = raw["Head of Department"].trim()
    if (!existingEmployeeNumbers.has(candidate)) errors.push(`Head of Department "${candidate}" does not correspond to an existing employee.`)
    else headOfDepartmentId = candidate
  }

  const fingerprint = rowFingerprint(code)
  const isDuplicateInFile = code ? seen.has(fingerprint) : false
  if (code) seen.add(fingerprint)

  const data = {
    code,
    name: normalizeString(raw["Department Name"]),
    functionId,
    parentDepartmentId,
    headOfDepartmentId,
  }

  const status: ImportRowResult["status"] = errors.length > 0 ? "invalid" : isDuplicateInFile ? "duplicate" : existing ? "updated" : "new"
  return { row: rowNumber, status, data, errors }
}

async function applyRow(row: ImportRowResult, tx: Prisma.TransactionClient) {
  const data = row.data as { code: string; name: string; functionId: string; parentDepartmentId?: string; headOfDepartmentId?: string }
  await tx.department.upsert({
    where: { code: data.code },
    create: { code: data.code, name: data.name, functionId: data.functionId, parentDepartmentId: data.parentDepartmentId, headOfDepartmentId: data.headOfDepartmentId },
    update: { name: data.name, functionId: data.functionId, parentDepartmentId: data.parentDepartmentId, headOfDepartmentId: data.headOfDepartmentId },
  })
  return { action: row.status === "new" ? ("created" as const) : ("updated" as const), employeeNumber: undefined }
}

export const departmentsImportConfig: ImportModuleConfig = {
  key: "departments",
  label: "Departments",
  referenceKeyLabel: "Department Code",
  matchStrategy: "codeUpdate",
  columns: COLUMNS,
  buildContext,
  validateRow,
  applyRow,
}
