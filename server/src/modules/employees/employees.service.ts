import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { EmploymentStatus, FamilyRelationship, NotificationType, Prisma, PositionChangeType } from "@prisma/client"
import * as bcrypt from "bcryptjs"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../common/pagination"
import { buildClientUrl } from "../../common/client-url.util"
import { PrismaService } from "../../prisma/prisma.service"
import { DEFAULT_EMPLOYEE_PASSWORD } from "../auth/default-password.constant"
import { computeTemporaryPasswordExpiry } from "../auth/temporary-password.constant"
import { EmailService } from "../email/email.service"
import { LeaveBalancesService } from "../leave/leave-balances/leave-balances.service"
import { AssignmentsService } from "../learning/assignments/assignments.service"

import { AssignPositionDto } from "./dto/assign-position.dto"
import { ChangeBandDto } from "./dto/change-band.dto"
import { CreateEmployeeDto } from "./dto/create-employee.dto"
import { CreateEducationDto, UpdateEducationDto } from "./dto/education.dto"
import { ProcessExitDto } from "./dto/process-exit.dto"
import { RehireEmployeeDto } from "./dto/rehire-employee.dto"
import { TransferEmployeeDto } from "./dto/transfer-employee.dto"
import { CreateChildDto, UpdateChildDto, UpdatePartnerDto } from "./dto/update-family.dto"
import { UpdateEmployeeDto } from "./dto/update-employee.dto"
import { UpdateEmploymentDetailsDto } from "./dto/update-employment-details.dto"

const EMPLOYEE_LIST_INCLUDE = {
  position: { include: { department: true, unit: true, level: true } },
  band: true,
  branch: true,
} as const

// See the identical constant in leave-requests.service.ts — Prisma's 5s
// default interactive-transaction timeout is too tight for a pooled Neon
// connection under cold-start latency.
const TRANSACTION_OPTIONS = { timeout: 15000, maxWait: 10000 }

// Sentinel "no contract end date" value — see updateEmploymentDetails()'s
// doc comment for why this is filled in rather than left null.
const FAR_FUTURE_CONTRACT_END_DATE = new Date(Date.UTC(9999, 11, 31))

const EMPLOYEE_DETAIL_INCLUDE = {
  ...EMPLOYEE_LIST_INCLUDE,
  children: { orderBy: { dateOfBirth: "asc" } },
  education: { orderBy: { startDate: "desc" } },
} as const

/** Same shape as EMPLOYEE_LIST_INCLUDE, plus Position -> Department ->
 *  Function nested one level deeper than the admin table needs — only the
 *  column-picker export (EmployeesExportService) reads the Function name. */
export const EMPLOYEE_EXPORT_INCLUDE = {
  position: { include: { department: { include: { function: true } }, unit: true, level: true } },
  band: true,
  branch: true,
} as const

export interface ReportingManagerResult {
  manager: { id: string; firstName: string; lastName: string; positionId: string } | null
  source: "OVERRIDE" | "POSITION_HIERARCHY" | "NONE"
  /** Populated only when POSITION_HIERARCHY resolves to more than one
   *  employee holding the parent position — Position is a role/template,
   *  so this is possible and left for the caller/UI to disambiguate. */
  candidates?: { id: string; firstName: string; lastName: string }[]
}

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveBalancesService: LeaveBalancesService,
    private readonly assignmentsService: AssignmentsService,
    private readonly emailService: EmailService
  ) {}

  private buildFindAllWhere(params: {
    departmentId?: string
    unitId?: string
    positionId?: string
    branchId?: string
    bandId?: string
    levelId?: string
    includeInactive?: boolean
    search?: string
  }): Prisma.EmployeeWhereInput {
    const { departmentId, unitId, positionId, branchId, bandId, levelId, includeInactive, search } = params

    return {
      ...(includeInactive ? {} : { isActive: true }),
      ...(positionId ? { positionId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(bandId ? { bandId } : {}),
      ...(departmentId || unitId || levelId
        ? {
            position: {
              ...(departmentId ? { departmentId } : {}),
              ...(unitId ? { unitId } : {}),
              ...(levelId ? { levelId } : {}),
            },
          }
        : {}),
      // Same OR/contains/insensitive shape as CandidatesService — matches
      // on name, employee number (Staff ID), or email.
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
              { employeeNumber: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    }
  }

  /** Full, unpaginated list — used by dropdowns/cascading selects
   *  throughout the app (e.g. delegate pickers) that need every match, not
   *  just a page of them. See findAllPaginated() for the admin table view. */
  findAll(params: {
    departmentId?: string
    unitId?: string
    positionId?: string
    branchId?: string
    bandId?: string
    levelId?: string
    includeInactive?: boolean
  } = {}) {
    return this.prisma.employee.findMany({
      where: this.buildFindAllWhere(params),
      include: EMPLOYEE_LIST_INCLUDE,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    })
  }

  /** Paginated version for the Employees admin table (20 rows/page by
   *  default) — see server/src/common/pagination.ts. */
  async findAllPaginated(
    params: {
      departmentId?: string
      unitId?: string
      positionId?: string
      branchId?: string
      bandId?: string
      levelId?: string
      includeInactive?: boolean
      search?: string
    } = {},
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResult<Prisma.EmployeeGetPayload<{ include: typeof EMPLOYEE_LIST_INCLUDE }>>> {
    const where = this.buildFindAllWhere(params)
    const { skip, take, page: normalizedPage, pageSize: normalizedPageSize } = normalizePagination(
      page,
      pageSize
    )

    const [data, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        include: EMPLOYEE_LIST_INCLUDE,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip,
        take,
      }),
      this.prisma.employee.count({ where }),
    ])

    return buildPaginatedResult(data, total, normalizedPage, normalizedPageSize)
  }

  /** Full, unpaginated list with the deeper (Function-inclusive) include —
   *  backs the Employees table's column-picker export. Not paginated: an
   *  export is meant to cover every row matching the current filters, same
   *  reasoning as findAll() above. */
  findAllForExport(params: {
    departmentId?: string
    unitId?: string
    positionId?: string
    branchId?: string
    bandId?: string
    levelId?: string
    includeInactive?: boolean
  } = {}) {
    return this.prisma.employee.findMany({
      where: this.buildFindAllWhere(params),
      include: EMPLOYEE_EXPORT_INCLUDE,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    })
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNumber: id },
      include: EMPLOYEE_DETAIL_INCLUDE,
    })

    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`)
    }

    return employee
  }

  /** Used by the client's mock-login flow to resolve a demo user's
   *  employeeNumber to a real Employee record, so self-service leave pages
   *  ("my balance", "my requests") have a concrete employee to scope to. */
  async findByEmployeeNumber(employeeNumber: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNumber },
      include: EMPLOYEE_DETAIL_INCLUDE,
    })

    if (!employee) {
      throw new NotFoundException(`Employee ${employeeNumber} not found`)
    }

    return employee
  }

  /**
   * Step 1 (Basic Information) — the only required step. Creates the
   * Employee row with no position/band yet; every other field/step is
   * filled in afterwards via its own endpoint. employeeNumber is generated
   * here unless the caller explicitly supplied one (see
   * CreateEmployeeDto.employeeNumber's doc comment — that's only meant for
   * preserving a legacy staff ID during a bulk migration import).
   *
   * First Login Security (mustChangePassword/temporaryPasswordExpiresAt) is
   * set up here, since login credentials exist from day one. The Employee
   * Welcome Email itself, however, is deliberately NOT sent here anymore —
   * an earlier version of this method fired it at creation, before
   * position/department were ever knowable, so it always read "To be
   * assigned"/"To be confirmed". It's now sent from assignPosition()
   * instead, the first time a position is actually assigned (see that
   * method's doc comment) — the tradeoff being login credentials arrive a
   * step later than before, once the wizard's Position Assignment step is
   * complete, rather than immediately at creation.
   */
  async create(dto: CreateEmployeeDto) {
    // Every new employee gets a real login from day one — default password,
    // expected to be changed from their profile page (see AuthService).
    const passwordHash = await bcrypt.hash(DEFAULT_EMPLOYEE_PASSWORD, 10)
    const temporaryPasswordExpiresAt = computeTemporaryPasswordExpiry()
    const requestedEmployeeNumber = dto.employeeNumber?.trim()
    const { employeeNumber: _requestedEmployeeNumberField, ...createFields } = dto

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const employee = await this.prisma.$transaction(async (tx) => {
          const employeeNumber = requestedEmployeeNumber || (await this.generateEmployeeNumber(tx))
          return tx.employee.create({
            data: {
              ...createFields,
              employeeNumber,
              passwordHash,
              mustChangePassword: true,
              temporaryPasswordExpiresAt,
            },
            include: EMPLOYEE_DETAIL_INCLUDE,
          })
        }, TRANSACTION_OPTIONS)
        // Sick/Compassionate/Maternity/Paternity balances don't depend on
        // contract type, so they can be allocated from day one — Annual
        // Leave follows once a contract type is set (see
        // updateEmploymentDetails below).
        await this.leaveBalancesService.ensureBalancesForEmployee(employee.employeeNumber)

        return employee
      } catch (error) {
        if (this.isUniqueConflict(error, "employeeNumber")) {
          if (requestedEmployeeNumber) {
            // A caller-supplied number, not a generated one — retrying
            // would fail identically every time, so fail fast with a
            // message that actually explains what to do.
            throw new ConflictException(`Employee number "${requestedEmployeeNumber}" is already in use.`)
          }
          continue // race on the generated number — regenerate and retry
        }
        throw this.translateUniqueConflict(error)
      }
    }
    throw new ConflictException("Could not generate a unique employee number — please retry.")
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOne(id)
    try {
      return await this.prisma.employee.update({
        where: { employeeNumber: id },
        data: dto,
        include: EMPLOYEE_DETAIL_INCLUDE,
      })
    } catch (error) {
      throw this.translateUniqueConflict(error)
    }
  }

  /**
   * Step 2 — Employment Details. Fully optional, safe to call repeatedly
   * with partial data as the user fills the step in over multiple visits.
   *
   * One business rule enforced here rather than left to the client:
   * probation is mandatory for PERMANENT contracts. If the caller doesn't
   * supply a probationEndDate, and the employee doesn't already have one on
   * file, it's defaulted to employmentStartDate + 3 months as soon as both
   * a PERMANENT contractType and a start date are known — HR can always
   * extend it afterwards by saving a new value, which this defaulting
   * logic will then respect (it only fills gaps, never overwrites).
   */
  async updateEmploymentDetails(id: string, dto: UpdateEmploymentDetailsDto) {
    const employee = await this.findOne(id)

    const effectiveContractType = dto.contractType ?? employee.contractType
    const effectiveStartDate = dto.employmentStartDate ?? employee.employmentStartDate ?? null

    const shouldDefaultProbation =
      effectiveContractType === "PERMANENT" &&
      dto.probationEndDate === undefined &&
      !employee.probationEndDate &&
      effectiveStartDate !== null

    // "No contract end date" convention: rather than leaving this null
    // forever, it's defaulted to a far-future sentinel (9999-12-31) the
    // first time it's ever saved — same "fill gaps, never overwrite" rule
    // as probationEndDate just above. A real end date (e.g. a fixed-term
    // TEMPORARY contract) always wins whenever it's actually supplied, and
    // once set is never silently reset back to the sentinel by a later
    // call that simply doesn't mention this field.
    const shouldDefaultContractEnd = dto.contractEndDate === undefined && !employee.contractEndDate

    // Reset the reminder-sent flag whenever the date it guards actually
    // changes to a new value — otherwise an extended probation/contract
    // would stay silently marked "already reminded" against its old
    // deadline and never get a fresh reminder for the new one. Compared by
    // timestamp (not just presence) since HR might resave the same date.
    const probationDateChanged =
      dto.probationEndDate !== undefined &&
      (!employee.probationEndDate || new Date(dto.probationEndDate).getTime() !== new Date(employee.probationEndDate).getTime())
    const contractDateChanged =
      dto.contractEndDate !== undefined &&
      (!employee.contractEndDate || new Date(dto.contractEndDate).getTime() !== new Date(employee.contractEndDate).getTime())

    const updated = await this.prisma.employee.update({
      where: { employeeNumber: id },
      data: {
        ...dto,
        ...(shouldDefaultProbation
          ? { probationEndDate: this.addMonths(effectiveStartDate!, 3) }
          : {}),
        ...(shouldDefaultContractEnd ? { contractEndDate: FAR_FUTURE_CONTRACT_END_DATE } : {}),
        ...(probationDateChanged || shouldDefaultProbation ? { probationReminderSentAt: null } : {}),
        ...(contractDateChanged ? { contractReminderSentAt: null } : {}),
      },
      include: EMPLOYEE_DETAIL_INCLUDE,
    })

    if (dto.contractType) {
      // Contract type just became known (or changed) — (re)allocate Annual
      // Leave entitlement for it.
      await this.leaveBalancesService.ensureBalancesForEmployee(id)
    }

    if (dto.employmentStartDate && updated.employmentStartDate) {
      // Employment start date just became known (or changed) — auto-assign
      // any mandatory onboarding training (e.g. AML) due within N months of
      // it. Idempotent, so safe even if this fires again on a later edit.
      await this.assignmentsService.assignAutoHireCourses(id, updated.employmentStartDate)
    }

    return updated
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date)
    result.setMonth(result.getMonth() + months)
    return result
  }

  /**
   * Step 3 — Position Assignment. Handles both the employee's very first
   * assignment and revisions made while still working through the wizard:
   * if there's no currently-open PositionHistory row yet, one is created
   * (INITIAL_HIRE). If one already exists, it's edited in place instead of
   * opening a second row — this endpoint represents "my answer to this
   * wizard step", not a formal transfer. Once the employee is fully
   * onboarded, use transferPosition/changeBand for real position changes,
   * which always open a new history row and close the old one.
   *
   * This is also the trigger point for the Employee Welcome Email (moved
   * here from create() — see that method's doc comment for why): it fires
   * exactly once per employee, precisely when `openHistory` is null, i.e.
   * the very first real position assignment. Later calls to this same
   * method while still revising the wizard step (openHistory already
   * exists) don't resend it, and neither does a later formal transfer
   * (that's a different method entirely). By this point department,
   * position, and start date are always real values — no more "To be
   * assigned"/"To be confirmed" placeholders.
   */
  async assignPosition(id: string, dto: AssignPositionDto) {
    await this.findOne(id)
    await this.assertPositionExists(dto.positionId)
    await this.assertBandExists(dto.bandId)

    return this.prisma
      .$transaction(async (tx) => {
        const openHistory = await tx.positionHistory.findFirst({
          where: { employeeId: id, effectiveTo: null },
        })
        const isInitialHire = !openHistory

        if (openHistory) {
          await tx.positionHistory.update({
            where: { id: openHistory.id },
            data: { positionId: dto.positionId, bandId: dto.bandId, effectiveFrom: dto.effectiveFrom },
          })
        } else {
          await tx.positionHistory.create({
            data: {
              employeeId: id,
              positionId: dto.positionId,
              bandId: dto.bandId,
              changeType: PositionChangeType.INITIAL_HIRE,
              effectiveFrom: dto.effectiveFrom,
            },
          })
        }

        const employee = await tx.employee.update({
          where: { employeeNumber: id },
          data: {
            positionId: dto.positionId,
            bandId: dto.bandId,
            ...(dto.reportingManagerOverrideId !== undefined
              ? { reportingManagerOverrideId: dto.reportingManagerOverrideId }
              : {}),
          },
          include: EMPLOYEE_DETAIL_INCLUDE,
        })

        return { employee, isInitialHire }
      }, TRANSACTION_OPTIONS)
      .then(async ({ employee, isInitialHire }) => {
        // Being placed in the Managing Director position changes the Annual
        // Leave entitlement category, so re-resolve it here too.
        await this.leaveBalancesService.ensureBalancesForEmployee(id)

        if (isInitialHire) {
          // Best-effort: a broken email template or transient DB hiccup here
          // must never fail a successful position assignment.
          try {
            await this.emailService.enqueue({
              templateKey: "employee_welcome",
              recipientEmail: employee.email,
              recipientEmployeeId: employee.employeeNumber,
              relatedModule: "employees",
              relatedEntityId: employee.employeeNumber,
              variables: {
                employee_name: `${employee.firstName} ${employee.lastName}`,
                employee_number: employee.employeeNumber,
                department: employee.position?.department?.name ?? "To be assigned",
                position: employee.position?.title ?? "To be assigned",
                start_date: employee.employmentStartDate ? employee.employmentStartDate.toISOString().slice(0, 10) : "To be confirmed",
                login_url: buildClientUrl("/login"),
                username: employee.email,
                temporary_password: DEFAULT_EMPLOYEE_PASSWORD,
              },
            })
          } catch {
            // EmailService.enqueue() already logs internally; nothing
            // further to do here except make sure it can't fail the
            // position assignment itself.
          }
        }

        return employee
      })
  }

  async deactivate(id: string) {
    await this.findOne(id)
    return this.prisma.employee.update({
      where: { employeeNumber: id },
      data: { isActive: false, employmentStatus: EmploymentStatus.EXIT },
    })
  }

  /**
   * Exit Management. A richer, deliberate version of deactivate() driven by
   * the "Process Employee Exit" dialog: records exit date/reason/type/next
   * move/comments for historical reporting, closes out the currently-open
   * PositionHistory row as of the exit date, and clears positionId so the
   * position becomes vacant (Position is a reusable role/template, so
   * "vacant" just means no one currently holds it — no separate flag
   * needed). Band is left untouched as a historical record of the
   * employee's final grade. The employee row itself is never deleted.
   *
   * Hard gate: if this employee has any ExitDocumentAssignment rows (i.e.
   * ExitProcessService.initiateExit() bulk-assigned the exit checklist),
   * every one of them must be complete before the exit can be finalized —
   * the one place in Exit Management with a real database-level block
   * (contrast with the Exit Clearance Form, which is tracked but not
   * enforced). If no exit documents were ever assigned, exit proceeds as
   * before — this keeps direct/legacy use of this dialog working.
   */
  async processExit(id: string, dto: ProcessExitDto) {
    const employee = await this.findOne(id)

    const exitDocuments = await this.prisma.exitDocumentAssignment.findMany({
      where: { employeeId: id },
      include: { documentType: true },
    })
    const incomplete = exitDocuments.filter((assignment) => !assignment.isCompleted)
    if (incomplete.length > 0) {
      throw new BadRequestException(
        `All exit documents must be completed before the exit can be confirmed. Outstanding: ${incomplete.map((a) => a.documentType.name).join(", ")}.`
      )
    }

    return this.prisma.$transaction(async (tx) => {
      if (employee.positionId) {
        await tx.positionHistory.updateMany({
          where: { employeeId: id, effectiveTo: null },
          data: { effectiveTo: dto.exitDate },
        })
      }

      return tx.employee.update({
        where: { employeeNumber: id },
        data: {
          employmentStatus: EmploymentStatus.EXIT,
          isActive: false,
          positionId: null,
          exitDate: dto.exitDate,
          exitReason: dto.exitReason,
          exitType: dto.exitType,
          nextMove: dto.nextMove,
          exitComments: dto.comments,
        },
        include: EMPLOYEE_DETAIL_INCLUDE,
      })
    }, TRANSACTION_OPTIONS)
  }

  /**
   * Marks the non-terminal start of the Exit Management process —
   * deliberately separate from processExit() above, which remains the
   * terminal finalize/clearance step. Called by ExitProcessModule's
   * ExitProcessService (a sibling module that depends on this one, so this
   * method stays here rather than EmployeesModule taking on a dependency on
   * Forms Management, which would create a circular module import since
   * FormInstancesModule already depends on EmployeesModule). No hard
   * database-level gate exists between exitInitiatedAt and processExit() —
   * the Exit Form's completion is surfaced to HR as a tracker only, per the
   * spec's "employee should complete the form before exit clearance can
   * continue" being a process expectation, not an enforced block.
   */
  async markExitInitiated(id: string, actingEmployeeId: string) {
    const employee = await this.findOne(id)

    if (employee.employmentStatus !== EmploymentStatus.ACTIVE) {
      throw new BadRequestException("Only active employees can begin the Exit Management process.")
    }
    if (employee.exitInitiatedAt) {
      throw new ConflictException("The Exit Management process has already been started for this employee.")
    }

    return this.prisma.employee.update({
      where: { employeeNumber: id },
      data: { exitInitiatedAt: new Date(), exitInitiatedById: actingEmployeeId },
      include: EMPLOYEE_DETAIL_INCLUDE,
    })
  }

  /**
   * Rehire. The one-way reverse of processExit() — reuses the same
   * employeeNumber (never deleted) rather than creating a new Employee row,
   * so PositionHistory/exit documents/everything else stays attached to one
   * continuous record across both stints.
   *
   * Before clearing the current exit* fields, the prior stint's details are
   * snapshotted into previousEmployee/previousPositionHeld/
   * previousDepartment/previousExitDate/previousReasonForLeaving — the same
   * fields HR fills in manually on the Employment Details step when
   * registering someone who previously worked at the bank, reused here
   * since this rehire IS that scenario. previousPositionHeld/
   * previousDepartment are resolved from the most recently closed
   * PositionHistory row rather than employee.positionId, since
   * processExit() already cleared that to null.
   *
   * The employee comes back in the same "no position yet" state a brand
   * new hire starts in (positionId/bandId/contractType cleared) — HR must
   * re-run Position Assignment, same as onboarding a new employee. A fresh
   * temporary password is issued since the account may have sat dormant.
   */
  async rehire(id: string, dto: RehireEmployeeDto) {
    const employee = await this.findOne(id)

    if (employee.employmentStatus !== EmploymentStatus.EXIT) {
      throw new BadRequestException("Only employees with Exit status can be rehired.")
    }

    const lastHistory = await this.prisma.positionHistory.findFirst({
      where: { employeeId: id },
      orderBy: { effectiveTo: "desc" },
      include: { position: { include: { department: true } } },
    })

    const previousPositionHeld = lastHistory?.position?.title ?? employee.previousPositionHeld ?? null
    const previousDepartment = lastHistory?.position?.department?.name ?? employee.previousDepartment ?? null
    const reasonParts = [employee.exitReason, employee.exitComments].filter((part): part is string => Boolean(part))
    const previousReasonForLeaving = dto.comments ?? (reasonParts.length > 0 ? reasonParts.join(" — ") : employee.previousReasonForLeaving)
    const employmentStartDate = dto.employmentStartDate ?? new Date()

    const updated = await this.prisma.employee.update({
      where: { employeeNumber: id },
      data: {
        employmentStatus: EmploymentStatus.ACTIVE,
        isActive: true,
        employmentStartDate,
        probationEndDate: null,
        probationReminderSentAt: null,
        contractEndDate: null,
        contractReminderSentAt: null,
        contractType: null,
        positionId: null,
        bandId: null,
        exitDate: null,
        exitReason: null,
        exitType: null,
        nextMove: null,
        exitComments: null,
        exitInitiatedAt: null,
        exitInitiatedById: null,
        previousEmployee: true,
        previousEmployeeNumber: employee.employeeNumber,
        previousPositionHeld,
        previousDepartment,
        previousExitDate: employee.exitDate,
        previousReasonForLeaving,
        rehiredAt: new Date(),
        rehiredById: dto.actingEmployeeId,
        mustChangePassword: true,
        temporaryPasswordExpiresAt: computeTemporaryPasswordExpiry(),
      },
      include: EMPLOYEE_DETAIL_INCLUDE,
    })

    await this.leaveBalancesService.ensureBalancesForEmployee(updated.employeeNumber)

    const employeeUrl = buildClientUrl(`/admin/employees/${updated.employeeNumber}`)
    try {
      await this.emailService.enqueue({
        templateKey: "employee_rehired",
        recipientEmail: updated.email,
        recipientEmployeeId: updated.employeeNumber,
        relatedModule: "employees",
        relatedEntityId: updated.employeeNumber,
        variables: {
          employee_name: `${updated.firstName} ${updated.lastName}`,
          start_date: employmentStartDate.toISOString().slice(0, 10),
          employee_url: employeeUrl,
        },
      })
    } catch {
      // EmailService.enqueue() already logs internally.
    }

    await this.prisma.notification.create({
      data: {
        recipientEmployeeId: updated.employeeNumber,
        type: NotificationType.EMPLOYEE_REHIRED,
        title: "Welcome back!",
        message: `Your employee record has been reactivated effective ${employmentStartDate.toISOString().slice(0, 10)}.`,
        actionUrl: `/admin/employees/${updated.employeeNumber}`,
      },
    })

    return updated
  }

  /**
   * Moves the employee to a new position, closing out the currently-open
   * PositionHistory row and opening a new one — this is the audit trail for
   * promotions, demotions, transfers, and reporting-line changes. Requires
   * the employee to already have gone through the initial position
   * assignment (Step 3).
   */
  async transferPosition(id: string, dto: TransferEmployeeDto) {
    const employee = await this.findOne(id)
    if (!employee.positionId || !employee.bandId) {
      throw new BadRequestException(
        "Employee has no current position yet — complete Position Assignment first."
      )
    }
    await this.assertPositionExists(dto.positionId)

    return this.prisma.$transaction(async (tx) => {
      await tx.positionHistory.updateMany({
        where: { employeeId: id, effectiveTo: null },
        data: { effectiveTo: dto.effectiveFrom },
      })

      await tx.positionHistory.create({
        data: {
          employeeId: id,
          positionId: dto.positionId,
          bandId: employee.bandId!,
          changeType: dto.changeType as unknown as PositionChangeType,
          changeReason: dto.changeReason,
          effectiveFrom: dto.effectiveFrom,
        },
      })

      return tx.employee.update({
        where: { employeeNumber: id },
        data: { positionId: dto.positionId },
        include: EMPLOYEE_DETAIL_INCLUDE,
      })
    }, TRANSACTION_OPTIONS)
  }

  /** Changes only the Band, independent of Position, per the spec. Requires
   *  the employee to already have gone through Position Assignment. */
  async changeBand(id: string, dto: ChangeBandDto) {
    const employee = await this.findOne(id)
    if (!employee.positionId || !employee.bandId) {
      throw new BadRequestException(
        "Employee has no current position yet — complete Position Assignment first."
      )
    }
    await this.assertBandExists(dto.bandId)

    return this.prisma.$transaction(async (tx) => {
      await tx.positionHistory.updateMany({
        where: { employeeId: id, effectiveTo: null },
        data: { effectiveTo: dto.effectiveFrom },
      })

      await tx.positionHistory.create({
        data: {
          employeeId: id,
          positionId: employee.positionId!,
          bandId: dto.bandId,
          changeType: PositionChangeType.BAND_CHANGE,
          changeReason: dto.changeReason,
          effectiveFrom: dto.effectiveFrom,
        },
      })

      return tx.employee.update({
        where: { employeeNumber: id },
        data: { bandId: dto.bandId },
        include: EMPLOYEE_DETAIL_INCLUDE,
      })
    }, TRANSACTION_OPTIONS)
  }

  getHistory(id: string) {
    return this.prisma.positionHistory.findMany({
      where: { employeeId: id },
      include: { position: true, band: true },
      orderBy: { effectiveFrom: "desc" },
    })
  }

  // ---- Step 4: Family Information ---------------------------------------

  /**
   * Admin Access management (Settings > Admin Access). isAdmin is a plain
   * boolean on Employee (see its schema doc comment) that AuthService's
   * login flow reads to decide session.role — this is the first place in
   * the app that lets an admin flip it for someone else through the UI
   * rather than editing the seed/DB directly. Two guardrails:
   *   - Can't grant admin access to an inactive/exited employee — the
   *     account would have no password-login path worth protecting anyway.
   *   - Can't revoke the very last remaining admin — this app has no
   *     "forgot password"/superuser recovery flow (see AuthService's doc
   *     comment), so that would permanently lock everyone out of /admin.
   */
  async setAdminAccess(id: string, isAdmin: boolean) {
    const employee = await this.findOne(id)

    if (isAdmin && !employee.isActive) {
      throw new BadRequestException("Cannot grant admin access to an inactive employee.")
    }

    if (!isAdmin && employee.isAdmin) {
      const otherAdmins = await this.prisma.employee.count({
        where: { isAdmin: true, isActive: true, employeeNumber: { not: id } },
      })
      if (otherAdmins === 0) {
        throw new BadRequestException("Cannot remove admin access from the last remaining admin.")
      }
    }

    return this.prisma.employee.update({
      where: { employeeNumber: id },
      data: { isAdmin },
      include: EMPLOYEE_DETAIL_INCLUDE,
    })
  }

  async updatePartner(id: string, dto: UpdatePartnerDto) {
    await this.findOne(id)
    return this.prisma.employee.update({
      where: { employeeNumber: id },
      data: dto,
      include: EMPLOYEE_DETAIL_INCLUDE,
    })
  }

  async addChild(employeeId: string, dto: CreateChildDto) {
    await this.findOne(employeeId)
    return this.prisma.employeeChild.create({ data: { employeeId, ...dto } })
  }

  async updateChild(employeeId: string, childId: string, dto: UpdateChildDto) {
    await this.assertChildBelongsToEmployee(employeeId, childId)
    return this.prisma.employeeChild.update({ where: { id: childId }, data: dto })
  }

  async removeChild(employeeId: string, childId: string) {
    await this.assertChildBelongsToEmployee(employeeId, childId)
    await this.prisma.employeeChild.delete({ where: { id: childId } })
  }

  /**
   * Visual "Family Tree" data — this is the first read path this app has
   * ever had for EmployeeFamilyMember (spouse/parent/sibling/other), which
   * until now could only be created via the Bulk Import framework's Family
   * Members module and had no page anywhere that displayed it back. Merges
   * two sources per relationship, since the schema deliberately keeps them
   * separate (see EmployeeFamilyMember's doc comment):
   *   - "primary" = the Step 4 registration wizard's own fields
   *     (Employee.partnerName/... for spouse, EmployeeChild for children).
   *   - "additional" = EmployeeFamilyMember rows of the matching
   *     relationship (bulk-imported, or any relationship the wizard has no
   *     field for at all — parents/siblings/other).
   */
  async getFamilyTree(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNumber: id },
      select: {
        employeeNumber: true,
        firstName: true,
        lastName: true,
        profilePictureUrl: true,
        partnerName: true,
        partnerPhone: true,
        partnerDateOfBirth: true,
        children: { orderBy: { dateOfBirth: "asc" } },
        familyMembers: { orderBy: { createdAt: "asc" } },
      },
    })

    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`)
    }

    const byRelationship = (relationship: FamilyRelationship) => employee.familyMembers.filter((member) => member.relationship === relationship)

    return {
      employee: {
        id: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        profilePictureUrl: employee.profilePictureUrl,
      },
      parents: byRelationship("PARENT"),
      siblings: byRelationship("SIBLING"),
      other: byRelationship("OTHER"),
      spouse: {
        primary: employee.partnerName
          ? { name: employee.partnerName, phone: employee.partnerPhone, dateOfBirth: employee.partnerDateOfBirth }
          : null,
        additional: byRelationship("SPOUSE"),
      },
      children: {
        primary: employee.children,
        additional: byRelationship("CHILD"),
      },
    }
  }

  // ---- Step 5: Education & Professional Development ----------------------

  async addEducation(employeeId: string, dto: CreateEducationDto) {
    await this.findOne(employeeId)
    return this.prisma.employeeEducation.create({ data: { employeeId, ...dto } })
  }

  async updateEducation(employeeId: string, educationId: string, dto: UpdateEducationDto) {
    await this.assertEducationBelongsToEmployee(employeeId, educationId)
    return this.prisma.employeeEducation.update({ where: { id: educationId }, data: dto })
  }

  async removeEducation(employeeId: string, educationId: string) {
    await this.assertEducationBelongsToEmployee(employeeId, educationId)
    await this.prisma.employeeEducation.delete({ where: { id: educationId } })
  }

  /**
   * Resolves who this employee reports to. Per the spec: "The reporting
   * manager should be determined automatically from the Position hierarchy
   * rather than manually assigned wherever possible" — so the override is
   * only consulted first because it represents a documented exception, not
   * because it's the primary mechanism.
   */
  async getReportingManager(id: string): Promise<ReportingManagerResult> {
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNumber: id },
      include: { reportingManagerOverride: true, position: true },
    })

    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`)
    }

    if (employee.reportingManagerOverride) {
      const override = employee.reportingManagerOverride
      if (!override.positionId) {
        return { manager: null, source: "NONE" }
      }
      return {
        manager: {
          id: override.employeeNumber,
          firstName: override.firstName,
          lastName: override.lastName,
          positionId: override.positionId,
        },
        source: "OVERRIDE",
      }
    }

    if (!employee.position || !employee.position.reportsToPositionId) {
      // No position yet, or top of the tree (e.g. Managing Director) — no manager.
      return { manager: null, source: "NONE" }
    }

    const candidates = await this.prisma.employee.findMany({
      where: { positionId: employee.position.reportsToPositionId, isActive: true },
      select: { employeeNumber: true, firstName: true, lastName: true, positionId: true },
    })

    const resolvable = candidates
      .filter(
        (candidate): candidate is typeof candidate & { positionId: string } =>
          candidate.positionId !== null
      )
      .map((candidate) => ({
        id: candidate.employeeNumber,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        positionId: candidate.positionId,
      }))

    if (resolvable.length === 0) {
      return { manager: null, source: "NONE" }
    }

    return {
      manager: resolvable[0],
      source: "POSITION_HIERARCHY",
      ...(resolvable.length > 1 ? { candidates: resolvable } : {}),
    }
  }

  /** Batch version of getReportingManager() for the employee list table —
   *  same override-first-then-position-hierarchy resolution, but computed
   *  for every active employee from two in-memory maps built off a single
   *  query, rather than one getReportingManager() call per row. Doesn't
   *  replicate the single-employee version's "override may point at an
   *  inactive employee" edge case, since this list only ever needs to
   *  surface managers who are themselves active. */
  async getLineManagersBatch(): Promise<Record<string, { id: string; firstName: string; lastName: string } | null>> {
    const employees = await this.prisma.employee.findMany({
      where: { isActive: true },
      select: {
        employeeNumber: true,
        firstName: true,
        lastName: true,
        positionId: true,
        reportingManagerOverrideId: true,
        position: { select: { reportsToPositionId: true } },
      },
    })

    const byPositionId = new Map<string, typeof employees>()
    for (const employee of employees) {
      if (!employee.positionId) continue
      const list = byPositionId.get(employee.positionId) ?? []
      list.push(employee)
      byPositionId.set(employee.positionId, list)
    }
    const byEmployeeNumber = new Map(employees.map((employee) => [employee.employeeNumber, employee]))

    const result: Record<string, { id: string; firstName: string; lastName: string } | null> = {}
    for (const employee of employees) {
      if (employee.reportingManagerOverrideId) {
        const override = byEmployeeNumber.get(employee.reportingManagerOverrideId)
        result[employee.employeeNumber] = override
          ? { id: override.employeeNumber, firstName: override.firstName, lastName: override.lastName }
          : null
        continue
      }

      const reportsToPositionId = employee.position?.reportsToPositionId
      if (!reportsToPositionId) {
        result[employee.employeeNumber] = null
        continue
      }

      const candidates = byPositionId.get(reportsToPositionId) ?? []
      result[employee.employeeNumber] = candidates[0]
        ? { id: candidates[0].employeeNumber, firstName: candidates[0].firstName, lastName: candidates[0].lastName }
        : null
    }

    return result
  }

  /**
   * The inverse of getReportingManager()/getLineManagersBatch(): everyone
   * whose resolved manager (override-first, else position hierarchy — same
   * rule as those two) is this employee. Powers "my team" on the staff
   * dashboard and the line-manager leave-approval queue's headcount.
   * Reuses getLineManagersBatch() rather than re-deriving resolution logic a
   * third time — a little wasteful (computes everyone's manager, not just
   * this one employee's reports) but this module already accepts that
   * tradeoff for getLineManagersBatch()'s own callers, and direct-report
   * lookups aren't hot-path/high-frequency enough to warrant a bespoke query.
   */
  async getDirectReports(managerId: string) {
    const [manager, allManagers] = await Promise.all([
      this.prisma.employee.findUnique({ where: { employeeNumber: managerId } }),
      this.getLineManagersBatch(),
    ])

    if (!manager) {
      throw new NotFoundException(`Employee ${managerId} not found`)
    }

    const directReportIds = Object.entries(allManagers)
      .filter(([, reportsTo]) => reportsTo?.id === managerId)
      .map(([employeeNumber]) => employeeNumber)

    if (directReportIds.length === 0) {
      return []
    }

    return this.prisma.employee.findMany({
      where: { employeeNumber: { in: directReportIds } },
      select: {
        employeeNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        position: { select: { title: true } },
        branch: { select: { name: true } },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    })
  }

  private async assertPositionExists(positionId: string) {
    const position = await this.prisma.position.findUnique({ where: { id: positionId } })
    if (!position) {
      throw new NotFoundException(`Position ${positionId} not found`)
    }
  }

  private async assertBandExists(bandId: string) {
    const band = await this.prisma.band.findUnique({ where: { id: bandId } })
    if (!band) {
      throw new NotFoundException(`Band ${bandId} not found`)
    }
  }

  private async assertChildBelongsToEmployee(employeeId: string, childId: string) {
    const child = await this.prisma.employeeChild.findUnique({ where: { id: childId } })
    if (!child || child.employeeId !== employeeId) {
      throw new NotFoundException(`Child record ${childId} not found for this employee`)
    }
  }

  private async assertEducationBelongsToEmployee(employeeId: string, educationId: string) {
    const education = await this.prisma.employeeEducation.findUnique({ where: { id: educationId } })
    if (!education || education.employeeId !== employeeId) {
      throw new NotFoundException(`Education record ${educationId} not found for this employee`)
    }
  }

  /**
   * employeeNumber is generated as EMP-0001, EMP-0002, ... To stay correct
   * even if the zero-padded width is ever exceeded (EMP-10000 onward), this
   * parses the numeric suffix of every existing number and takes the max in
   * JS rather than relying on a lexical ORDER BY, which would break past
   * 9999. Fine at HR-system scale; swap for a DB sequence if this ever
   * needs to scale to a much larger workforce.
   */
  private async generateEmployeeNumber(tx: Prisma.TransactionClient): Promise<string> {
    const employees = await tx.employee.findMany({ select: { employeeNumber: true } })
    const max = employees.reduce((highest, employee) => {
      const match = /^EMP-(\d+)$/.exec(employee.employeeNumber)
      return match ? Math.max(highest, parseInt(match[1], 10)) : highest
    }, 0)
    return `EMP-${String(max + 1).padStart(4, "0")}`
  }

  private isUniqueConflict(error: unknown, field: string): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Boolean((error.meta?.target as string[] | undefined)?.includes(field))
    )
  }

  private translateUniqueConflict(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined) ?? []
      if (target.includes("email")) return new ConflictException("A record with this email already exists.")
      if (target.includes("nationalIdNumber"))
        return new ConflictException("A record with this National ID / Passport number already exists.")
      if (target.includes("employeeNumber"))
        return new ConflictException("This employee number is already in use.")
      return new ConflictException("This record conflicts with an existing one.")
    }
    return error
  }
}
