import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../../common/pagination"
import { PrismaService } from "../../../prisma/prisma.service"

import { CreatePositionDto } from "./dto/create-position.dto"
import { UpdatePositionDto } from "./dto/update-position.dto"

const POSITION_LIST_INCLUDE = { department: true, unit: true, level: true, reportsTo: true } as const

/**
 * The PositionLevel.code this codebase treats as "the single head of the
 * whole bank" — same convention as MANAGING_DIRECTOR_LEVEL_CODE in
 * admin-eligibility.util.ts and the equivalent check in
 * leave-balances.service.ts. Enforced here as a standing business rule:
 * only one active position may sit at this level; it never reports to
 * anyone else; and the moment a position becomes this level, every other
 * active position that doesn't already have a manager of its own
 * (reportsToPositionId === null) is automatically re-pointed to report to
 * it instead of sitting as its own separate root. Ordinary departments
 * keep using General Manager as their head-of-department level — this
 * rule only ever applies to the one Director-level position.
 */
const DIRECTOR_LEVEL_CODE = "E1"

@Injectable()
export class PositionsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildFindAllWhere(params: {
    departmentId?: string
    unitId?: string
    reportsToPositionId?: string
    includeInactive?: boolean
    search?: string
  }): Prisma.PositionWhereInput {
    const { departmentId, unitId, reportsToPositionId, includeInactive = false, search } = params

    return {
      ...(includeInactive ? {} : { isActive: true }),
      ...(departmentId ? { departmentId } : {}),
      ...(unitId ? { unitId } : {}),
      ...(reportsToPositionId ? { reportsToPositionId } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
    }
  }

  /** Full, unpaginated list — used by cascading Department -> Position
   *  selects (e.g. Position Assignment step) that need every match. See
   *  findAllPaginated() for the admin table view. */
  findAll(
    params: {
      departmentId?: string
      unitId?: string
      reportsToPositionId?: string
      includeInactive?: boolean
      search?: string
    } = {}
  ) {
    return this.prisma.position.findMany({
      where: this.buildFindAllWhere(params),
      include: POSITION_LIST_INCLUDE,
      orderBy: { title: "asc" },
    })
  }

  /** Paginated version for the Positions admin table. */
  async findAllPaginated(
    params: {
      departmentId?: string
      unitId?: string
      reportsToPositionId?: string
      includeInactive?: boolean
      search?: string
    } = {},
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResult<Prisma.PositionGetPayload<{ include: typeof POSITION_LIST_INCLUDE }>>> {
    const where = this.buildFindAllWhere(params)
    const { skip, take, page: normalizedPage, pageSize: normalizedPageSize } = normalizePagination(
      page,
      pageSize
    )

    const [data, total] = await this.prisma.$transaction([
      this.prisma.position.findMany({
        where,
        include: POSITION_LIST_INCLUDE,
        orderBy: { title: "asc" },
        skip,
        take,
      }),
      this.prisma.position.count({ where }),
    ])

    return buildPaginatedResult(data, total, normalizedPage, normalizedPageSize)
  }

  async findOne(id: string) {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: {
        department: true,
        unit: true,
        level: true,
        reportsTo: true,
        directReports: { where: { isActive: true } },
        employees: { where: { isActive: true } },
      },
    })

    if (!position) {
      throw new NotFoundException(`Position ${id} not found`)
    }

    return position
  }

  async create(dto: CreatePositionDto) {
    await this.assertDepartmentExists(dto.departmentId)
    await this.assertUnitBelongsToDepartment(dto.unitId, dto.departmentId)
    const level = await this.assertLevelExists(dto.levelId)
    const isDirector = level.code === DIRECTOR_LEVEL_CODE

    let reportsToPositionId = dto.reportsToPositionId ?? null

    if (isDirector) {
      // Only one Director-level position may exist at a time, and it never
      // reports to anyone — it's the head of the whole bank.
      await this.assertSingleDirector()
      if (reportsToPositionId) {
        throw new BadRequestException(
          `"${dto.title}" is at the Director level — the head of the whole bank — and cannot report to another position.`
        )
      }
    } else if (!reportsToPositionId) {
      // No manager specified — auto-default to the bank's Director-level
      // position, if one exists, rather than leaving this as an orphan
      // root (see DIRECTOR_LEVEL_CODE's doc comment).
      reportsToPositionId = await this.findDirectorPositionId()
    }

    if (reportsToPositionId) {
      await this.assertPositionExists(reportsToPositionId)
      await this.assertReportsToLevelSufficient(dto.levelId, reportsToPositionId)
    }

    await this.assertTitleAvailable(dto.departmentId, dto.unitId ?? null, dto.title)

    const created = await this.prisma.position.create({ data: { ...dto, reportsToPositionId } })

    if (isDirector) {
      await this.promoteToBankHead(created.id, created.departmentId)
    }

    return created
  }

  async update(id: string, dto: UpdatePositionDto) {
    const current = await this.findOne(id)

    const departmentId = dto.departmentId ?? current.departmentId
    // `unitId` needs to distinguish "not provided" from "explicitly cleared
    // to null" (moving a position out of a unit onto the department directly).
    const unitId = Object.prototype.hasOwnProperty.call(dto, "unitId")
      ? dto.unitId ?? null
      : current.unitId

    if (dto.departmentId) {
      await this.assertDepartmentExists(dto.departmentId)
    }

    await this.assertUnitBelongsToDepartment(unitId ?? undefined, departmentId)

    const levelId = dto.levelId ?? current.levelId
    const level = dto.levelId ? await this.assertLevelExists(dto.levelId) : current.level
    const isDirector = level?.code === DIRECTOR_LEVEL_CODE
    const wasDirector = current.level?.code === DIRECTOR_LEVEL_CODE

    if (isDirector && !wasDirector) {
      await this.assertSingleDirector(id)
    }

    let reportsToPositionId = Object.prototype.hasOwnProperty.call(dto, "reportsToPositionId")
      ? dto.reportsToPositionId ?? null
      : current.reportsToPositionId

    if (isDirector) {
      if (reportsToPositionId) {
        throw new BadRequestException(
          `"${dto.title ?? current.title}" is at the Director level — the head of the whole bank — and cannot report to another position.`
        )
      }
    } else if (!reportsToPositionId) {
      // No manager specified/left — auto-default to the bank's
      // Director-level position, if one exists (excluding this position
      // itself, in case it's the one being demoted off that level right now).
      reportsToPositionId = await this.findDirectorPositionId(id)
    }

    if (reportsToPositionId) {
      await this.assertPositionExists(reportsToPositionId)
      await this.assertNoCycle(id, reportsToPositionId)
      await this.assertReportsToLevelSufficient(levelId, reportsToPositionId)
    }

    if (dto.title || dto.departmentId || Object.prototype.hasOwnProperty.call(dto, "unitId")) {
      await this.assertTitleAvailable(departmentId, unitId, dto.title ?? current.title, id)
    }

    const updated = await this.prisma.position.update({
      where: { id },
      data: { ...dto, reportsToPositionId },
    })

    if (isDirector && !wasDirector) {
      await this.promoteToBankHead(updated.id, updated.departmentId)
    }

    return updated
  }

  async remove(id: string) {
    await this.findOne(id)

    const activeReports = await this.prisma.position.count({
      where: { reportsToPositionId: id, isActive: true },
    })
    if (activeReports > 0) {
      throw new ConflictException(
        "Cannot deactivate a position that still has active positions reporting to it — reassign them first"
      )
    }

    return this.prisma.position.update({ where: { id }, data: { isActive: false } })
  }

  // ---- validation helpers -------------------------------------------------

  private async assertDepartmentExists(departmentId: string) {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
    })
    if (!department) {
      throw new NotFoundException(`Department ${departmentId} not found`)
    }
  }

  private async assertLevelExists(levelId: string) {
    const level = await this.prisma.positionLevel.findUnique({ where: { id: levelId } })
    if (!level) {
      throw new NotFoundException(`Position level ${levelId} not found`)
    }
    return level
  }

  /** Throws if another active position already sits at the Director level
   *  (`excludeId` lets an update check against every position except the
   *  one being saved). */
  private async assertSingleDirector(excludeId?: string) {
    const existing = await this.prisma.position.findFirst({
      where: {
        isActive: true,
        level: { code: DIRECTOR_LEVEL_CODE },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    })
    if (existing) {
      throw new ConflictException(
        `"${existing.title}" is already the bank's Director-level position — only one is allowed at a time. Change or deactivate it first.`
      )
    }
  }

  /** The current bank-head position, if one exists — used to auto-default
   *  any other position's reportsToPositionId when left blank. */
  private async findDirectorPositionId(excludeId?: string): Promise<string | null> {
    const director = await this.prisma.position.findFirst({
      where: {
        isActive: true,
        level: { code: DIRECTOR_LEVEL_CODE },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    })
    return director?.id ?? null
  }

  /**
   * Runs once, right after a position becomes the bank's single
   * Director-level position: every other active position that doesn't
   * already have a manager of its own (reportsToPositionId === null) is
   * re-pointed to report to it, instead of sitting as its own separate
   * root — this is what makes it "head of the whole bank" rather than
   * just head of its own department. Also sets it as its own department's
   * head (Department.headOfDepartmentId), if an employee currently holds it.
   */
  private async promoteToBankHead(directorPositionId: string, departmentId: string) {
    await this.prisma.position.updateMany({
      where: {
        isActive: true,
        reportsToPositionId: null,
        NOT: { id: directorPositionId },
      },
      data: { reportsToPositionId: directorPositionId },
    })

    const holder = await this.prisma.employee.findFirst({
      where: { positionId: directorPositionId, isActive: true },
      select: { employeeNumber: true },
    })
    if (holder) {
      await this.prisma.department.update({
        where: { id: departmentId },
        data: { headOfDepartmentId: holder.employeeNumber },
      })
    }
  }

  private async assertPositionExists(positionId: string) {
    const position = await this.prisma.position.findUnique({ where: { id: positionId } })
    if (!position) {
      throw new NotFoundException(`Position ${positionId} not found`)
    }
  }

  /** A unit, if provided, must belong to the same department as the position. */
  private async assertUnitBelongsToDepartment(unitId: string | undefined, departmentId: string) {
    if (!unitId) return

    const unit = await this.prisma.unit.findUnique({ where: { id: unitId } })
    if (!unit) {
      throw new NotFoundException(`Unit ${unitId} not found`)
    }
    if (unit.departmentId !== departmentId) {
      throw new BadRequestException(
        `Unit "${unit.name}" does not belong to the given department`
      )
    }
  }

  /**
   * Enforced here rather than in the schema: Postgres treats every NULL as
   * distinct, so the DB-level @@unique([departmentId, unitId, title]) does
   * not stop two department-level positions (unitId = NULL) from sharing a
   * title.
   */
  private async assertTitleAvailable(
    departmentId: string,
    unitId: string | null,
    title: string,
    excludeId?: string
  ) {
    const existing = await this.prisma.position.findFirst({
      where: {
        departmentId,
        unitId,
        title,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    })

    if (existing) {
      throw new ConflictException(`A position titled "${title}" already exists in this scope`)
    }
  }

  /**
   * A position may report to anyone in the bank, regardless of department —
   * but only to someone at the same level or more senior. Rank increases
   * with seniority (see prisma/seed.ts: Intern=1 ... CEO/CFO/COO/CTO in the
   * teens), so this rejects reporting to a strictly-lower-ranked position.
   */
  private async assertReportsToLevelSufficient(levelId: string, reportsToPositionId: string) {
    const [level, targetPosition] = await Promise.all([
      this.prisma.positionLevel.findUnique({ where: { id: levelId } }),
      this.prisma.position.findUnique({
        where: { id: reportsToPositionId },
        include: { level: true },
      }),
    ])

    if (!level || !targetPosition?.level) {
      // Missing level/position is reported by the existing assertLevelExists /
      // assertPositionExists checks that run alongside this one — nothing
      // further to validate here.
      return
    }

    if (targetPosition.level.rank < level.rank) {
      throw new BadRequestException(
        `"${targetPosition.title}" (${targetPosition.level.name}) is a lower level than the position being saved (${level.name}) — a position can only report to someone at the same level or more senior.`
      )
    }
  }

  /**
   * Walks up the reportsTo chain from `newParentId` and rejects the change
   * if it ever reaches `positionId` (which would create a cycle) or loops
   * more than the tree could realistically be deep (guards against bad
   * pre-existing data causing an infinite loop instead of a clean error).
   */
  private async assertNoCycle(positionId: string, newParentId: string) {
    if (positionId === newParentId) {
      throw new BadRequestException("A position cannot report to itself")
    }

    let currentId: string | null = newParentId
    const maxDepth = 100
    let depth = 0

    while (currentId) {
      if (depth++ > maxDepth) {
        throw new ConflictException(
          "Reporting chain exceeds the maximum expected depth — check for a pre-existing cycle"
        )
      }

      if (currentId === positionId) {
        throw new ConflictException(
          "This change would create a circular reporting relationship"
        )
      }

      const parent: { reportsToPositionId: string | null } | null =
        await this.prisma.position.findUnique({
          where: { id: currentId },
          select: { reportsToPositionId: true },
        })

      currentId = parent?.reportsToPositionId ?? null
    }
  }
}
