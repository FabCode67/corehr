import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { EmploymentStatus, Prisma, PositionChangeType } from "@prisma/client"
import * as bcrypt from "bcryptjs"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../common/pagination"
import { PrismaService } from "../../prisma/prisma.service"
import { DEFAULT_EMPLOYEE_PASSWORD } from "../auth/default-password.constant"
import { LeaveBalancesService } from "../leave/leave-balances/leave-balances.service"
import { AssignmentsService } from "../learning/assignments/assignments.service"

import { AssignPositionDto } from "./dto/assign-position.dto"
import { ChangeBandDto } from "./dto/change-band.dto"
import { CreateEmployeeDto } from "./dto/create-employee.dto"
import { CreateEducationDto, UpdateEducationDto } from "./dto/education.dto"
import { ProcessExitDto } from "./dto/process-exit.dto"
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

const EMPLOYEE_DETAIL_INCLUDE = {
  ...EMPLOYEE_LIST_INCLUDE,
  children: { orderBy: { dateOfBirth: "asc" } },
  education: { orderBy: { startDate: "desc" } },
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
    private readonly assignmentsService: AssignmentsService
  ) {}

  private buildFindAllWhere(params: {
    departmentId?: string
    unitId?: string
    positionId?: string
    includeInactive?: boolean
  }): Prisma.EmployeeWhereInput {
    const { departmentId, unitId, positionId, includeInactive } = params

    return {
      ...(includeInactive ? {} : { isActive: true }),
      ...(positionId ? { positionId } : {}),
      ...(departmentId || unitId
        ? {
            position: {
              ...(departmentId ? { departmentId } : {}),
              ...(unitId ? { unitId } : {}),
            },
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
      includeInactive?: boolean
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
   * here, never client-supplied.
   */
  async create(dto: CreateEmployeeDto) {
    // Every new employee gets a real login from day one — default password,
    // expected to be changed from their profile page (see AuthService).
    const passwordHash = await bcrypt.hash(DEFAULT_EMPLOYEE_PASSWORD, 10)

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const employee = await this.prisma.$transaction(async (tx) => {
          const employeeNumber = await this.generateEmployeeNumber(tx)
          return tx.employee.create({
            data: { ...dto, employeeNumber, passwordHash },
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

    const updated = await this.prisma.employee.update({
      where: { employeeNumber: id },
      data: {
        ...dto,
        ...(shouldDefaultProbation
          ? { probationEndDate: this.addMonths(effectiveStartDate!, 3) }
          : {}),
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
   */
  async assignPosition(id: string, dto: AssignPositionDto) {
    await this.findOne(id)
    await this.assertPositionExists(dto.positionId)
    await this.assertBandExists(dto.bandId)

    return this.prisma.$transaction(async (tx) => {
      const openHistory = await tx.positionHistory.findFirst({
        where: { employeeId: id, effectiveTo: null },
      })

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

      return tx.employee.update({
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
    }, TRANSACTION_OPTIONS).then(async (employee) => {
      // Being placed in the Managing Director position changes the Annual
      // Leave entitlement category, so re-resolve it here too.
      await this.leaveBalancesService.ensureBalancesForEmployee(id)
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
   */
  async processExit(id: string, dto: ProcessExitDto) {
    const employee = await this.findOne(id)

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
