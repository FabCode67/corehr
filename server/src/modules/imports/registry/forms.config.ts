import { FormInstanceStatus, type Prisma } from "@prisma/client"

import type { ImportContext, ImportDeps, ImportModuleConfig, ImportRowResult, ImportTemplateColumn } from "./types"
import { isBlank, normalizeEnum, normalizeString, parseFlexibleDate, requireField, rowFingerprint, validateDate, validateEnum } from "../validators.util"

const STATUS_VALUES = Object.values(FormInstanceStatus)
const OPEN_STATUSES = new Set<string>(["DRAFT", "ASSIGNED", "IN_PROGRESS", "SUBMITTED", "PENDING_SIGNATURES"])

/**
 * FormInstance has no DB-level unique constraint on (formTemplateId,
 * employeeId) — multiple assignments of the same form to the same employee
 * over time are legitimate (e.g. an annual form re-assigned every year), so
 * this module really is insert-only. As a safety net (not a hard rule),
 * rows are still flagged "duplicate" in preview if the employee already has
 * an *open* (non-terminal) instance of the same form, so a re-upload of the
 * same file doesn't silently spam duplicate open assignments — HR can still
 * force it through by clearing that row's flag isn't supported in this
 * pass, so a genuinely-intended re-assignment needs its own explicit action
 * in Forms Management instead.
 */
const COLUMNS: ImportTemplateColumn[] = [
  { key: "employeeNumber", header: "Employee Number", required: true, example: "EMP-0001" },
  { key: "formName", header: "Form Name", required: true, example: "Exit Clearance Form" },
  { key: "dueDate", header: "Due Date", required: false, example: "2026-03-01" },
  { key: "assignedDate", header: "Assigned Date", required: false, example: "2026-02-01" },
  { key: "status", header: "Status", required: false, example: "ASSIGNED", description: STATUS_VALUES.join(" | ") + " (defaults to ASSIGNED)" },
]

async function buildContext(deps: ImportDeps): Promise<ImportContext> {
  const { prisma } = deps
  const [employees, templates, openInstances] = await Promise.all([
    prisma.employee.findMany({ select: { employeeNumber: true } }),
    prisma.formTemplate.findMany({ where: { status: "ACTIVE" }, select: { id: true, title: true, version: true } }),
    prisma.formInstance.findMany({
      where: { status: { in: ["DRAFT", "ASSIGNED", "IN_PROGRESS", "SUBMITTED", "PENDING_SIGNATURES"] } },
      select: { employeeId: true, formTemplateId: true },
    }),
  ])
  return {
    existingEmployeeNumbers: new Set(employees.map((e) => e.employeeNumber)),
    templates,
    openKeys: new Set(openInstances.map((i) => `${i.employeeId}|${i.formTemplateId}`)),
  }
}

function validateRow(raw: Record<string, string>, rowNumber: number, ctx: ImportContext, seen: Set<string>): ImportRowResult {
  const errors: string[] = []
  const existingEmployeeNumbers = ctx.existingEmployeeNumbers as Set<string>
  const templates = ctx.templates as { id: string; title: string; version: number }[]
  const openKeys = ctx.openKeys as Set<string>

  for (const label of ["Employee Number", "Form Name"]) {
    const error = requireField(raw[label], label)
    if (error) errors.push(error)
  }

  const employeeNumber = normalizeString(raw["Employee Number"])
  if (employeeNumber && !existingEmployeeNumbers.has(employeeNumber)) {
    errors.push(`Employee Number "${employeeNumber}" does not correspond to an existing employee.`)
  }

  let formTemplateId: string | undefined
  let formVersion: number | undefined
  if (!isBlank(raw["Form Name"])) {
    const matches = templates.filter((t) => t.title.toLowerCase() === raw["Form Name"].toLowerCase())
    if (matches.length === 0) errors.push(`Form "${raw["Form Name"]}" does not exist as an active form template.`)
    else if (matches.length > 1) errors.push(`Form "${raw["Form Name"]}" is ambiguous — multiple active templates share this title.`)
    else {
      formTemplateId = matches[0].id
      formVersion = matches[0].version
    }
  }

  if (!isBlank(raw["Status"])) {
    const error = validateEnum(raw["Status"], "Status", STATUS_VALUES)
    if (error) errors.push(error)
  }
  const dueDateError = validateDate(raw["Due Date"], "Due Date")
  if (dueDateError) errors.push(dueDateError)
  const assignedDateError = validateDate(raw["Assigned Date"], "Assigned Date")
  if (assignedDateError) errors.push(assignedDateError)

  const hasOpenAssignment = employeeNumber && formTemplateId ? openKeys.has(`${employeeNumber}|${formTemplateId}`) : false

  const fingerprint = rowFingerprint(employeeNumber, raw["Form Name"])
  const isDuplicateInFile = seen.has(fingerprint)
  seen.add(fingerprint)

  const data = {
    employeeId: employeeNumber,
    formTemplateId,
    formVersion,
    dueDate: parseFlexibleDate(raw["Due Date"]),
    assignmentDate: parseFlexibleDate(raw["Assigned Date"]),
    status: normalizeEnum(raw["Status"], STATUS_VALUES) ?? "ASSIGNED",
  }

  const status: ImportRowResult["status"] = errors.length > 0 ? "invalid" : isDuplicateInFile || hasOpenAssignment ? "duplicate" : "new"
  return { row: rowNumber, status, employeeNumber, data, errors }
}

async function applyRow(row: ImportRowResult, tx: Prisma.TransactionClient, _ctx: ImportContext, importedById: string) {
  const data = row.data as {
    employeeId: string
    formTemplateId: string
    formVersion: number
    dueDate?: Date
    assignmentDate?: Date
    status: string
  }

  await tx.formInstance.create({
    data: {
      formTemplateId: data.formTemplateId,
      formVersion: data.formVersion,
      employeeId: data.employeeId,
      assignedById: importedById,
      assignmentDate: data.assignmentDate ?? new Date(),
      dueDate: data.dueDate,
      status: data.status as never,
    },
  })

  return { action: "created" as const, employeeNumber: data.employeeId }
}

export const formsImportConfig: ImportModuleConfig = {
  key: "forms",
  label: "Forms Assignment",
  referenceKeyLabel: "Employee Number",
  matchStrategy: "insertOnly",
  columns: COLUMNS,
  buildContext,
  validateRow,
  applyRow,
}
