import type { Prisma } from "@prisma/client"

import type { ImportContext, ImportDeps, ImportModuleConfig, ImportRowResult, ImportTemplateColumn } from "./types"
import { isBlank, normalizeString, requireField, rowFingerprint } from "../validators.util"

/**
 * "Parent Department" in the spec maps to Function, this schema's existing
 * top-level grouping above Department — there is no self-referential
 * Department-to-Department hierarchy anywhere else in the app (org chart,
 * dashboards, every other module all key off Function), so introducing one
 * here would create a second hierarchy nothing else understands. Function
 * also happens to be Department's one required FK, so this mapping
 * conveniently satisfies that requirement too.
 */
const COLUMNS: ImportTemplateColumn[] = [
  { key: "code", header: "Department Code", required: true, example: "HR" },
  { key: "name", header: "Department Name", required: true, example: "Human Resources" },
  { key: "parentDepartment", header: "Parent Department", required: true, example: "Corporate Services", description: "Maps to Function — this schema's grouping directly above Department." },
  { key: "headOfDepartment", header: "Head of Department", required: false, example: "EMP-0001", description: "Employee Number of the department head." },
]

async function buildContext(deps: ImportDeps): Promise<ImportContext> {
  const { prisma } = deps
  const [functions, departments, employees] = await Promise.all([
    prisma.function.findMany({ select: { id: true, name: true } }),
    prisma.department.findMany({ select: { id: true, code: true, functionId: true } }),
    prisma.employee.findMany({ select: { employeeNumber: true } }),
  ])
  return {
    functions,
    departmentsByCode: new Map(departments.filter((d) => d.code).map((d) => [d.code as string, d])),
    existingEmployeeNumbers: new Set(employees.map((e) => e.employeeNumber)),
  }
}

function validateRow(raw: Record<string, string>, rowNumber: number, ctx: ImportContext, seen: Set<string>): ImportRowResult {
  const errors: string[] = []
  const functions = ctx.functions as { id: string; name: string }[]
  const departmentsByCode = ctx.departmentsByCode as Map<string, { id: string; functionId: string }>
  const existingEmployeeNumbers = ctx.existingEmployeeNumbers as Set<string>

  for (const label of ["Department Code", "Department Name", "Parent Department"]) {
    const error = requireField(raw[label], label)
    if (error) errors.push(error)
  }

  const code = normalizeString(raw["Department Code"])
  const existing = code ? departmentsByCode.get(code) : undefined

  let functionId: string | undefined
  if (!isBlank(raw["Parent Department"])) {
    const fn = functions.find((f) => f.name.toLowerCase() === raw["Parent Department"].toLowerCase())
    if (!fn) errors.push(`Function "${raw["Parent Department"]}" does not exist (Parent Department maps to Function).`)
    else functionId = fn.id
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
    headOfDepartmentId,
  }

  const status: ImportRowResult["status"] = errors.length > 0 ? "invalid" : isDuplicateInFile ? "duplicate" : existing ? "updated" : "new"
  return { row: rowNumber, status, data, errors }
}

async function applyRow(row: ImportRowResult, tx: Prisma.TransactionClient) {
  const data = row.data as { code: string; name: string; functionId: string; headOfDepartmentId?: string }
  await tx.department.upsert({
    where: { code: data.code },
    create: { code: data.code, name: data.name, functionId: data.functionId, headOfDepartmentId: data.headOfDepartmentId },
    update: { name: data.name, functionId: data.functionId, headOfDepartmentId: data.headOfDepartmentId },
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
