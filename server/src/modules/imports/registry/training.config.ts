import { CourseAssignmentStatus, type Prisma } from "@prisma/client"

import type { ImportContext, ImportDeps, ImportModuleConfig, ImportRowResult, ImportTemplateColumn } from "./types"
import { isBlank, normalizeEnum, normalizeNumber, normalizeString, requireField, rowFingerprint, validateDate, validateEnum, parseFlexibleDate, validateNumber } from "../validators.util"

const STATUS_VALUES = Object.values(CourseAssignmentStatus)

/**
 * CourseAssignment enforces @@unique([courseId, employeeId]) at the DB
 * level — same justified exception as the Performance module: upsert-by
 * composite-key, not plain insert-only. "Provider" isn't a CourseAssignment
 * field; it's used only to disambiguate Course by institution when two
 * courses share a name (Course.name has no uniqueness constraint, unlike
 * courseCode).
 */
const COLUMNS: ImportTemplateColumn[] = [
  { key: "employeeNumber", header: "Employee Number", required: true, example: "EMP-0001" },
  { key: "course", header: "Course", required: true, example: "AML & Compliance Fundamentals" },
  { key: "provider", header: "Provider", required: false, example: "", description: "Institution name, only needed if Course name is ambiguous." },
  { key: "status", header: "Status", required: true, example: "VERIFIED", description: STATUS_VALUES.join(" | ") },
  { key: "completionDate", header: "Completion Date", required: false, example: "2026-03-01" },
  { key: "score", header: "Score", required: false, example: "88" },
  { key: "certificateNumber", header: "Certificate Number", required: false, example: "" },
]

async function buildContext(deps: ImportDeps): Promise<ImportContext> {
  const { prisma } = deps
  const [employees, courses, existingAssignments] = await Promise.all([
    prisma.employee.findMany({ select: { employeeNumber: true } }),
    prisma.course.findMany({ select: { id: true, name: true, categoryId: true, institution: { select: { name: true } }, category: { select: { name: true } } } }),
    prisma.courseAssignment.findMany({ select: { courseId: true, employeeId: true } }),
  ])
  return {
    existingEmployeeNumbers: new Set(employees.map((e) => e.employeeNumber)),
    courses,
    existingKeys: new Set(existingAssignments.map((a) => `${a.courseId}|${a.employeeId}`)),
  }
}

function validateRow(raw: Record<string, string>, rowNumber: number, ctx: ImportContext, seen: Set<string>): ImportRowResult {
  const errors: string[] = []
  const existingEmployeeNumbers = ctx.existingEmployeeNumbers as Set<string>
  const courses = ctx.courses as { id: string; name: string; institution: { name: string } | null; category: { name: string } }[]
  const existingKeys = ctx.existingKeys as Set<string>

  for (const label of ["Employee Number", "Course", "Status"]) {
    const error = requireField(raw[label], label)
    if (error) errors.push(error)
  }

  const employeeNumber = normalizeString(raw["Employee Number"])
  if (employeeNumber && !existingEmployeeNumbers.has(employeeNumber)) {
    errors.push(`Employee Number "${employeeNumber}" does not correspond to an existing employee.`)
  }

  let courseId: string | undefined
  let categoryName: string | undefined
  if (!isBlank(raw["Course"])) {
    const matches = courses.filter((c) => c.name.toLowerCase() === raw["Course"].toLowerCase())
    const narrowed = isBlank(raw["Provider"]) ? matches : matches.filter((c) => c.institution?.name.toLowerCase() === raw["Provider"].toLowerCase())
    if (narrowed.length === 0) {
      errors.push(`Course "${raw["Course"]}" does not exist${isBlank(raw["Provider"]) ? "" : ` from provider "${raw["Provider"]}"`}.`)
    } else if (narrowed.length > 1) {
      errors.push(`Course "${raw["Course"]}" is ambiguous — set Provider to disambiguate.`)
    } else {
      courseId = narrowed[0].id
      categoryName = narrowed[0].category.name
    }
  }

  const statusError = validateEnum(raw["Status"], "Status", STATUS_VALUES)
  if (statusError) errors.push(statusError)

  const completionDateError = validateDate(raw["Completion Date"], "Completion Date")
  if (completionDateError) errors.push(completionDateError)

  const scoreError = validateNumber(raw["Score"], "Score", { min: 0, max: 100 })
  if (scoreError) errors.push(scoreError)

  const naturalKey = courseId && employeeNumber ? `${courseId}|${employeeNumber}` : undefined
  const isExistingInDb = naturalKey ? existingKeys.has(naturalKey) : false

  const fingerprint = rowFingerprint(employeeNumber, raw["Course"])
  const isDuplicateInFile = seen.has(fingerprint)
  seen.add(fingerprint)

  const data = {
    employeeId: employeeNumber,
    courseId,
    categoryName,
    status: normalizeEnum(raw["Status"], STATUS_VALUES),
    completedAt: parseFlexibleDate(raw["Completion Date"]),
    score: normalizeNumber(raw["Score"]),
    certificateNumber: normalizeString(raw["Certificate Number"]),
  }

  const status: ImportRowResult["status"] = errors.length > 0 ? "invalid" : isDuplicateInFile ? "duplicate" : isExistingInDb ? "updated" : "new"
  return { row: rowNumber, status, employeeNumber, data, errors }
}

async function applyRow(row: ImportRowResult, tx: Prisma.TransactionClient) {
  const data = row.data as {
    employeeId: string
    courseId: string
    categoryName: string
    status: string
    completedAt?: Date
    score?: number
    certificateNumber?: string
  }

  await tx.courseAssignment.upsert({
    where: { courseId_employeeId: { courseId: data.courseId, employeeId: data.employeeId } },
    create: {
      courseId: data.courseId,
      employeeId: data.employeeId,
      categoryName: data.categoryName,
      isMandatory: false,
      status: data.status as never,
      completedAt: data.completedAt,
      score: data.score,
      certificateNumber: data.certificateNumber,
    },
    update: {
      status: data.status as never,
      completedAt: data.completedAt,
      score: data.score,
      certificateNumber: data.certificateNumber,
    },
  })

  return { action: row.status === "new" ? ("created" as const) : ("updated" as const), employeeNumber: data.employeeId }
}

export const trainingImportConfig: ImportModuleConfig = {
  key: "training",
  label: "Training",
  referenceKeyLabel: "Employee Number",
  matchStrategy: "compositeKeyUpdate",
  columns: COLUMNS,
  buildContext,
  validateRow,
  applyRow,
}
