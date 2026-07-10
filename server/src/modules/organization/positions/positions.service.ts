import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common"

import { PrismaService } from "../../../prisma/prisma.service"

import { CreatePositionDto } from "./dto/create-position.dto"
import { UpdatePositionDto } from "./dto/update-position.dto"

@Injectable()
export class PositionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(
    params: {
      departmentId?: string
      unitId?: string
      reportsToPositionId?: string
      includeInactive?: boolean
    } = {}
  ) {
    const { departmentId, unitId, reportsToPositionId, includeInactive = false } = params

    return this.prisma.position.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(departmentId ? { departmentId } : {}),
        ...(unitId ? { unitId } : {}),
        ...(reportsToPositionId ? { reportsToPositionId } : {}),
      },
      include: { department: true, unit: true, level: true, reportsTo: true },
      orderBy: { title: "asc" },
    })
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
    await this.assertLevelExists(dto.levelId)

    if (dto.reportsToPositionId) {
      await this.assertPositionExists(dto.reportsToPositionId)
    }

    await this.assertTitleAvailable(dto.departmentId, dto.unitId ?? null, dto.title)

    return this.prisma.position.create({ data: dto })
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

    if (dto.levelId) {
      await this.assertLevelExists(dto.levelId)
    }

    if (dto.reportsToPositionId !== undefined) {
      if (dto.reportsToPositionId) {
        await this.assertPositionExists(dto.reportsToPositionId)
        await this.assertNoCycle(id, dto.reportsToPositionId)
      }
    }

    if (dto.title || dto.departmentId || Object.prototype.hasOwnProperty.call(dto, "unitId")) {
      await this.assertTitleAvailable(departmentId, unitId, dto.title ?? current.title, id)
    }

    return this.prisma.position.update({ where: { id }, data: dto })
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
