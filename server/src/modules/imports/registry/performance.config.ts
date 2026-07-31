import { PerformanceReviewType, type Prisma } from "@prisma/client"

import type { ImportContext, ImportDeps, ImportModuleConfig, ImportRowResult, ImportTemplateColumn } from "./types"
import { isBlank, normalizeEnum, normalizeString, requireField, rowFingerprint, validateEnum, validateNumber } from "../validators.util"

const REVIEW_TYPE_VALUES = Object.values(PerformanceReviewType)

/**
 * PerformanceReview enforces @@unique([periodId, employeeId, reviewType]) at
 * the DB level — so unlike most child-record modules, this one really does
 * need upsert-by-composite-key rather than plain insert-only (see
 * ImportModuleConfig doc comment: a module whose target table already
 * enforces the natural key is the justified exception to the framework's
 * general "insert-only" default). "Review Type" and "Status" aren't in the
 * spec's field list but are required by the schema (reviewType is part of
 * that unique key; a review needs *some* status) — defaulted to ANNUAL /
 * FINALIZED when left blank, since this import is for landing completed
 * historical reviews, not starting a live review cycle. "KPI" maps to
 * goalsAchieved — the closest existing free-text field; there's no
 * dedicated KPI model on PerformanceReview.
 */
const COLUMNS: ImportTemplateColumn[] = [
  { key: "employeeNumber", header: "Employee Number", required: true, example: "EMP-0001" },
  { key: "reviewPeriod", header: "Review Period", required: true, example: "2026 Annual Review", description: "Must match an existing Review Period name." },
  { key: "reviewType", header: "Review Type", required: false, example: "ANNUAL", description: REVIEW_TYPE_VALUES.join(" | ") + " (defaults to ANNUAL)" },
  { key: "kpi", header: "KPI", required: false, example: "Achieved 110% of sales target" },
  { key: "rating", header: "Rating", required: true, example: "4" },
  { key: "reviewer", header: "Reviewer", required: false, example: "EMP-0002" },
  { key: "comments", header: "Comments", required: false, example: "" },
]

async function buildContext(deps: ImportDeps): Promise<ImportContext> {
  const { prisma } = deps
  const [employees, periods, ratingScale, existingReviews] = await Promise.all([
    prisma.employee.findMany({ select: { employeeNumber: true } }),
    prisma.performanceReviewPeriod.findMany({ select: { id: true, name: true } }),
    prisma.performanceRatingScale.findMany({ select: { rank: true }, where: { isActive: true } }),
    prisma.performanceReview.findMany({ select: { periodId: true, employeeId: true, reviewType: true } }),
  ])
  const ranks = ratingScale.map((r) => r.rank)
  return {
    existingEmployeeNumbers: new Set(employees.map((e) => e.employeeNumber)),
    periods,
    minRating: ranks.length ? Math.min(...ranks) : 1,
    maxRating: ranks.length ? Math.max(...ranks) : 5,
    existingKeys: new Set(existingReviews.map((r) => `${r.periodId}|${r.employeeId}|${r.reviewType}`)),
  }
}

function validateRow(raw: Record<string, string>, rowNumber: number, ctx: ImportContext, seen: Set<string>): ImportRowResult {
  const errors: string[] = []
  const existingEmployeeNumbers = ctx.existingEmployeeNumbers as Set<string>
  const periods = ctx.periods as { id: string; name: string }[]
  const minRating = ctx.minRating as number
  const maxRating = ctx.maxRating as number
  const existingKeys = ctx.existingKeys as Set<string>

  for (const label of ["Employee Number", "Review Period", "Rating"]) {
    const error = requireField(raw[label], label)
    if (error) errors.push(error)
  }

  const employeeNumber = normalizeString(raw["Employee Number"])
  if (employeeNumber && !existingEmployeeNumbers.has(employeeNumber)) {
    errors.push(`Employee Number "${employeeNumber}" does not correspond to an existing employee.`)
  }
  if (!isBlank(raw["Reviewer"]) && !existingEmployeeNumbers.has(raw["Reviewer"].trim())) {
    errors.push(`Reviewer "${raw["Reviewer"]}" does not correspond to an existing employee.`)
  }

  let periodId: string | undefined
  if (!isBlank(raw["Review Period"])) {
    const period = periods.find((p) => p.name.toLowerCase() === raw["Review Period"].toLowerCase())
    if (!period) errors.push(`Review Period "${raw["Review Period"]}" does not exist.`)
    else periodId = period.id
  }

  if (!isBlank(raw["Review Type"])) {
    const error = validateEnum(raw["Review Type"], "Review Type", REVIEW_TYPE_VALUES)
    if (error) errors.push(error)
  }
  const reviewType = normalizeEnum(raw["Review Type"], REVIEW_TYPE_VALUES) ?? "ANNUAL"

  const ratingError = validateNumber(raw["Rating"], "Rating", { min: minRating, max: maxRating })
  if (ratingError) errors.push(ratingError)

  const naturalKey = periodId && employeeNumber ? `${periodId}|${employeeNumber}|${reviewType}` : undefined
  const isExistingInDb = naturalKey ? existingKeys.has(naturalKey) : false

  const fingerprint = rowFingerprint(employeeNumber, raw["Review Period"], reviewType)
  const isDuplicateInFile = seen.has(fingerprint)
  seen.add(fingerprint)

  const data = {
    employeeId: employeeNumber,
    periodId,
    reviewType,
    reviewerId: normalizeString(raw["Reviewer"]),
    overallRating: Number(raw["Rating"]),
    goalsAchieved: normalizeString(raw["KPI"]),
    hrComments: normalizeString(raw["Comments"]),
  }

  const status: ImportRowResult["status"] = errors.length > 0 ? "invalid" : isDuplicateInFile ? "duplicate" : isExistingInDb ? "updated" : "new"
  return { row: rowNumber, status, employeeNumber, data, errors }
}

async function applyRow(row: ImportRowResult, tx: Prisma.TransactionClient) {
  const data = row.data as {
    employeeId: string
    periodId: string
    reviewType: string
    reviewerId?: string
    overallRating: number
    goalsAchieved?: string
    hrComments?: string
  }

  await tx.performanceReview.upsert({
    where: { periodId_employeeId_reviewType: { periodId: data.periodId, employeeId: data.employeeId, reviewType: data.reviewType as never } },
    create: {
      periodId: data.periodId,
      employeeId: data.employeeId,
      reviewType: data.reviewType as never,
      reviewerId: data.reviewerId,
      overallRating: data.overallRating,
      goalsAchieved: data.goalsAchieved,
      hrComments: data.hrComments,
      status: "FINALIZED",
      finalizedAt: new Date(),
    },
    update: {
      reviewerId: data.reviewerId,
      overallRating: data.overallRating,
      goalsAchieved: data.goalsAchieved,
      hrComments: data.hrComments,
    },
  })

  return { action: row.status === "new" ? ("created" as const) : ("updated" as const), employeeNumber: data.employeeId }
}

export const performanceImportConfig: ImportModuleConfig = {
  key: "performance",
  label: "Performance",
  referenceKeyLabel: "Employee Number",
  matchStrategy: "compositeKeyUpdate",
  columns: COLUMNS,
  buildContext,
  validateRow,
  applyRow,
}
