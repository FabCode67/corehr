import { LeaveRequestStatus, type Prisma } from "@prisma/client"

import type { ImportContext, ImportDeps, ImportModuleConfig, ImportRowResult, ImportTemplateColumn } from "./types"
import {
  isBlank,
  normalizeEnum,
  normalizeNumber,
  normalizeString,
  parseFlexibleDate,
  requireField,
  rowFingerprint,
  validateDate,
  validateEnum,
  validateNumber,
} from "../validators.util"

const STATUS_VALUES = Object.values(LeaveRequestStatus)
const BALANCE_CONSUMING_STATUSES = new Set<string>(["APPROVED", "COMPLETED"])
const ACTIVE_STATUSES = new Set<string>(["SUBMITTED", "PENDING_APPROVAL", "APPROVED"])

const COLUMNS: ImportTemplateColumn[] = [
  { key: "employeeNumber", header: "Employee Number", required: true, example: "EMP-0001" },
  { key: "leaveType", header: "Leave Type", required: true, example: "Annual Leave" },
  { key: "startDate", header: "Start Date", required: true, example: "2026-02-03" },
  { key: "endDate", header: "End Date", required: true, example: "2026-02-07" },
  { key: "numberOfDays", header: "Number of Days", required: true, example: "5" },
  { key: "status", header: "Status", required: true, example: "APPROVED", description: STATUS_VALUES.join(" | ") },
  { key: "approver", header: "Approver", required: false, example: "EMP-0002", description: "Employee Number. Validated but not linked to a formal approval step — this import lands historical records, not live approvals." },
  { key: "comments", header: "Comments", required: false, example: "" },
]

async function buildContext(deps: ImportDeps): Promise<ImportContext> {
  const { prisma } = deps
  const [employees, leaveTypes, existingRequests] = await Promise.all([
    prisma.employee.findMany({ select: { employeeNumber: true } }),
    prisma.leaveType.findMany({ select: { id: true, name: true } }),
    prisma.leaveRequest.findMany({
      where: { status: { in: ["SUBMITTED", "PENDING_APPROVAL", "APPROVED"] } },
      select: { employeeId: true, startDate: true, endDate: true },
    }),
  ])

  const overlapsByEmployee = new Map<string, { start: Date; end: Date }[]>()
  for (const request of existingRequests) {
    const list = overlapsByEmployee.get(request.employeeId) ?? []
    list.push({ start: request.startDate, end: request.endDate })
    overlapsByEmployee.set(request.employeeId, list)
  }

  return {
    existingEmployeeNumbers: new Set(employees.map((e) => e.employeeNumber)),
    leaveTypes,
    // Mutated as rows are validated so later rows in the same file are also
    // checked against earlier ones (intra-file overlap), not just what was
    // already in the database before this upload.
    overlapsByEmployee,
  }
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime()
}

function validateRow(raw: Record<string, string>, rowNumber: number, ctx: ImportContext, seen: Set<string>): ImportRowResult {
  const errors: string[] = []
  const existingEmployeeNumbers = ctx.existingEmployeeNumbers as Set<string>
  const leaveTypes = ctx.leaveTypes as { id: string; name: string }[]
  const overlapsByEmployee = ctx.overlapsByEmployee as Map<string, { start: Date; end: Date }[]>

  for (const label of ["Employee Number", "Leave Type", "Start Date", "End Date", "Number of Days", "Status"]) {
    const error = requireField(raw[label], label)
    if (error) errors.push(error)
  }

  const employeeNumber = normalizeString(raw["Employee Number"])
  if (employeeNumber && !existingEmployeeNumbers.has(employeeNumber)) {
    errors.push(`Employee Number "${employeeNumber}" does not correspond to an existing employee.`)
  }

  if (!isBlank(raw["Approver"]) && !existingEmployeeNumbers.has(raw["Approver"].trim())) {
    errors.push(`Approver "${raw["Approver"]}" does not correspond to an existing employee.`)
  }

  let leaveTypeId: string | undefined
  if (!isBlank(raw["Leave Type"])) {
    const leaveType = leaveTypes.find((lt) => lt.name.toLowerCase() === raw["Leave Type"].toLowerCase())
    if (!leaveType) errors.push(`Leave Type "${raw["Leave Type"]}" does not exist.`)
    else leaveTypeId = leaveType.id
  }

  const startDateError = validateDate(raw["Start Date"], "Start Date")
  if (startDateError) errors.push(startDateError)
  const endDateError = validateDate(raw["End Date"], "End Date")
  if (endDateError) errors.push(endDateError)

  const startDate = parseFlexibleDate(raw["Start Date"])
  const endDate = parseFlexibleDate(raw["End Date"])
  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    errors.push("End Date cannot be before Start Date.")
  }

  const daysError = validateNumber(raw["Number of Days"], "Number of Days", { min: 0.5, max: 365 })
  if (daysError) errors.push(daysError)

  const statusError = validateEnum(raw["Status"], "Status", STATUS_VALUES)
  if (statusError) errors.push(statusError)
  const status = normalizeEnum(raw["Status"], STATUS_VALUES)

  if (employeeNumber && startDate && endDate && status && ACTIVE_STATUSES.has(status)) {
    const existingRanges = overlapsByEmployee.get(employeeNumber) ?? []
    const overlap = existingRanges.some((range) => rangesOverlap(startDate, endDate, range.start, range.end))
    if (overlap) {
      errors.push(`This leave (${raw["Start Date"]} to ${raw["End Date"]}) overlaps with another active leave request for ${employeeNumber}.`)
    } else {
      existingRanges.push({ start: startDate, end: endDate })
      overlapsByEmployee.set(employeeNumber, existingRanges)
    }
  }

  const fingerprint = rowFingerprint(employeeNumber, raw["Leave Type"], raw["Start Date"], raw["End Date"])
  const isDuplicateInFile = seen.has(fingerprint)
  seen.add(fingerprint)

  const data = {
    employeeId: employeeNumber,
    leaveTypeId,
    startDate,
    endDate,
    numberOfDays: normalizeNumber(raw["Number of Days"]),
    status,
    reason: normalizeString(raw["Comments"]),
  }

  const status_: ImportRowResult["status"] = errors.length > 0 ? "invalid" : isDuplicateInFile ? "duplicate" : "new"
  return { row: rowNumber, status: status_, employeeNumber, data, errors }
}

async function applyRow(row: ImportRowResult, tx: Prisma.TransactionClient) {
  const data = row.data as {
    employeeId: string
    leaveTypeId: string
    startDate: Date
    endDate: Date
    numberOfDays: number
    status: string
    reason?: string
  }

  const returnDate = new Date(data.endDate)
  returnDate.setUTCDate(returnDate.getUTCDate() + 1)

  await tx.leaveRequest.create({
    data: {
      employeeId: data.employeeId,
      leaveTypeId: data.leaveTypeId,
      startDate: data.startDate,
      endDate: data.endDate,
      returnDate,
      numberOfDays: Math.round(data.numberOfDays),
      status: data.status as never,
      reason: data.reason,
    },
  })

  if (BALANCE_CONSUMING_STATUSES.has(data.status)) {
    const year = data.startDate.getUTCFullYear()
    await tx.leaveBalance.upsert({
      where: { employeeId_leaveTypeId_year: { employeeId: data.employeeId, leaveTypeId: data.leaveTypeId, year } },
      create: { employeeId: data.employeeId, leaveTypeId: data.leaveTypeId, year, takenDays: Math.round(data.numberOfDays) },
      update: { takenDays: { increment: Math.round(data.numberOfDays) } },
    })
  } else if (data.status === "SUBMITTED" || data.status === "PENDING_APPROVAL") {
    const year = data.startDate.getUTCFullYear()
    await tx.leaveBalance.upsert({
      where: { employeeId_leaveTypeId_year: { employeeId: data.employeeId, leaveTypeId: data.leaveTypeId, year } },
      create: { employeeId: data.employeeId, leaveTypeId: data.leaveTypeId, year, pendingDays: Math.round(data.numberOfDays) },
      update: { pendingDays: { increment: Math.round(data.numberOfDays) } },
    })
  }

  return { action: "created" as const, employeeNumber: data.employeeId }
}

export const leaveImportConfig: ImportModuleConfig = {
  key: "leave",
  label: "Leave",
  referenceKeyLabel: "Employee Number",
  matchStrategy: "insertOnly",
  columns: COLUMNS,
  buildContext,
  validateRow,
  applyRow,
}
