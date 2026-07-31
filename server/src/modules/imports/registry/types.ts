import type { Prisma, PrismaClient } from "@prisma/client"

import type { EmployeesService } from "../../employees/employees.service"
import type { NotificationsService } from "../../leave/notifications/notifications.service"

/**
 * Shared type surface for every import module config. A "module" here is
 * one entry in IMPORT_MODULES (imports/registry/index.ts) — Employee,
 * Leave, Department, etc. Adding a brand new module to the framework means
 * writing one new file implementing ImportModuleConfig and registering it
 * in index.ts; nothing else in the engine (ImportsService, controller,
 * client ImportManager component) needs to change.
 */

export interface ImportTemplateColumn {
  /** Internal field key — how ImportRowResult.data references this value. */
  key: string
  /** Column header exactly as it appears in the downloadable template. */
  header: string
  required: boolean
  example: string
  description?: string
}

export type ImportRowStatus = "new" | "updated" | "duplicate" | "invalid"

export interface ImportRowResult {
  /** 1-based row number as it appears in the uploaded file, excluding the header row. */
  row: number
  status: ImportRowStatus
  /** Populated whenever the row's reference key is an Employee Number — used for the Error Report. */
  employeeNumber?: string
  /** Normalized values keyed by ImportTemplateColumn.key, after parsing/coercion. */
  data: Record<string, unknown>
  errors: string[]
}

export interface ImportRowOutcome {
  row: number
  employeeNumber?: string
  action: "created" | "updated" | "skipped" | "failed"
  error?: string
}

/**
 * Real, DI-injected services made available to every config — not just
 * `prisma` — so a config can reuse actual business logic (position
 * history, leave balance provisioning, auto-hire course assignment, etc.)
 * instead of a raw write that would silently skip those side effects. Most
 * modules are simple enough to just write via `tx` directly (see each
 * config's own doc comment for which path it takes); the Employee module
 * is the main consumer of `employeesService` here.
 */
export interface ImportDeps {
  prisma: PrismaClient
  employeesService: EmployeesService
  notificationsService: NotificationsService
}

/** Context object built once per job (preview or commit) via buildContext,
 *  so row-level validation/apply never does N+1 queries for reference data
 *  (departments, branches, existing employees, etc.) — same batching
 *  philosophy as EmployeesService.getLineManagersBatch(). */
export type ImportContext = Record<string, unknown>

export type ImportMatchStrategy = "employeeNumberUpdate" | "codeUpdate" | "compositeKeyUpdate" | "insertOnly"

export interface ImportModuleConfig {
  key: string
  label: string
  /** Human label for the column that identifies "the same record" across re-uploads, e.g. "Employee Number" or "Department Code". */
  referenceKeyLabel: string
  /** See ImportsModule doc comment in schema.prisma: Employee updates by
   *  Employee Number, Department/Position update by Code, Performance/
   *  Training/Onboarding Documents update by a composite key the DB itself
   *  already enforces uniqueness on (see each config's own doc comment for
   *  which columns), and every other module is insert-only since there's
   *  no safe key to match a "child" record against on re-upload. */
  matchStrategy: ImportMatchStrategy
  /** True (the default assumed by ImportsService when this is omitted) for
   *  configs whose applyRow writes through the per-row `tx` it's given.
   *  Set to false for the rare config that ignores `tx` entirely and calls
   *  a real service instead (that service manages its own transaction) —
   *  see employees.config.ts and exit.config.ts. ImportsService uses this
   *  to skip opening a pointless, separately-timed-out outer transaction
   *  around a call that was never going to use it. */
  usesTransaction?: boolean
  columns: ImportTemplateColumn[]
  buildContext(deps: ImportDeps): Promise<ImportContext>
  /** Pure(ish) validation — no writes. `seen` is a per-job Set the config
   *  can use to detect duplicate rows within the same uploaded file
   *  (e.g. add the row's natural key to it and check `seen.has(key)`
   *  before adding). */
  validateRow(raw: Record<string, string>, rowNumber: number, ctx: ImportContext, seen: Set<string>): ImportRowResult
  /**
   * Only called for rows with status "new" or "updated". `tx` wraps just
   * THIS row's writes in its own transaction (ImportsService opens one
   * `$transaction` per row, not one for the whole job) — a row that fails
   * mid-write is fully rolled back and recorded as "failed" without
   * affecting any other row's already-committed result, which is what
   * makes the framework's "some rows fail, valid rows still commit"
   * behavior (Skipped/Failed counts) possible while each individual row
   * stays atomic. A module whose target table is touched by an existing
   * service with important side effects (see ImportDeps doc comment)
   * should call that service via `deps` instead and ignore `tx` entirely
   * (that service manages its own transaction); see employees.config.ts
   * and exit.config.ts for the two modules that do this, and why.
   */
  applyRow(
    row: ImportRowResult,
    tx: Prisma.TransactionClient,
    ctx: ImportContext,
    importedById: string,
    deps: ImportDeps
  ): Promise<{ action: "created" | "updated" | "skipped"; employeeNumber?: string }>
}
