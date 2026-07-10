import { Injectable, NotFoundException } from "@nestjs/common"
import { PositionChangeType } from "@prisma/client"

import { PrismaService } from "../../prisma/prisma.service"

import { ChangeBandDto } from "./dto/change-band.dto"
import { CreateEmployeeDto } from "./dto/create-employee.dto"
import { TransferEmployeeDto } from "./dto/transfer-employee.dto"
import { UpdateEmployeeDto } from "./dto/update-employee.dto"

const EMPLOYEE_INCLUDE = {
  position: { include: { department: true, unit: true, level: true } },
  band: true,
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
  constructor(private readonly prisma: PrismaService) {}

  findAll(params: { departmentId?: string; unitId?: string; positionId?: string } = {}) {
    const { departmentId, unitId, positionId } = params

    return this.prisma.employee.findMany({
      where: {
        isActive: true,
        ...(positionId ? { positionId } : {}),
        ...(departmentId || unitId
          ? {
              position: {
                ...(departmentId ? { departmentId } : {}),
                ...(unitId ? { unitId } : {}),
              },
            }
          : {}),
      },
      include: EMPLOYEE_INCLUDE,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    })
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: EMPLOYEE_INCLUDE,
    })

    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`)
    }

    return employee
  }

  async create(dto: CreateEmployeeDto) {
    await this.assertPositionExists(dto.positionId)
    await this.assertBandExists(dto.bandId)

    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({ data: dto })

      await tx.positionHistory.create({
        data: {
          employeeId: employee.id,
          positionId: dto.positionId,
          bandId: dto.bandId,
          changeType: PositionChangeType.INITIAL_HIRE,
          effectiveFrom: dto.hireDate,
        },
      })

      return employee
    })
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOne(id)
    return this.prisma.employee.update({ where: { id }, data: dto })
  }

  async deactivate(id: string) {
    await this.findOne(id)
    return this.prisma.employee.update({ where: { id }, data: { isActive: false } })
  }

  /**
   * Moves the employee to a new position, closing out the currently-open
   * PositionHistory row and opening a new one — this is the audit trail for
   * promotions, demotions, transfers, and reporting-line changes.
   */
  async transferPosition(id: string, dto: TransferEmployeeDto) {
    const employee = await this.findOne(id)
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
          bandId: employee.bandId,
          changeType: dto.changeType as unknown as PositionChangeType,
          changeReason: dto.changeReason,
          effectiveFrom: dto.effectiveFrom,
        },
      })

      return tx.employee.update({
        where: { id },
        data: { positionId: dto.positionId },
        include: EMPLOYEE_INCLUDE,
      })
    })
  }

  /** Changes only the Band, independent of Position, per the spec. */
  async changeBand(id: string, dto: ChangeBandDto) {
    const employee = await this.findOne(id)
    await this.assertBandExists(dto.bandId)

    return this.prisma.$transaction(async (tx) => {
      await tx.positionHistory.updateMany({
        where: { employeeId: id, effectiveTo: null },
        data: { effectiveTo: dto.effectiveFrom },
      })

      await tx.positionHistory.create({
        data: {
          employeeId: id,
          positionId: employee.positionId,
          bandId: dto.bandId,
          changeType: PositionChangeType.BAND_CHANGE,
          changeReason: dto.changeReason,
          effectiveFrom: dto.effectiveFrom,
        },
      })

      return tx.employee.update({
        where: { id },
        data: { bandId: dto.bandId },
        include: EMPLOYEE_INCLUDE,
      })
    })
  }

  getHistory(id: string) {
    return this.prisma.positionHistory.findMany({
      where: { employeeId: id },
      include: { position: true, band: true },
      orderBy: { effectiveFrom: "desc" },
    })
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
      where: { id },
      include: { reportingManagerOverride: true, position: true },
    })

    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`)
    }

    if (employee.reportingManagerOverride) {
      const override = employee.reportingManagerOverride
      return {
        manager: {
          id: override.id,
          firstName: override.firstName,
          lastName: override.lastName,
          positionId: override.positionId,
        },
        source: "OVERRIDE",
      }
    }

    if (!employee.position.reportsToPositionId) {
      // Top of the tree (e.g. Managing Director) — no manager.
      return { manager: null, source: "NONE" }
    }

    const candidates = await this.prisma.employee.findMany({
      where: { positionId: employee.position.reportsToPositionId, isActive: true },
      select: { id: true, firstName: true, lastName: true, positionId: true },
    })

    if (candidates.length === 0) {
      return { manager: null, source: "NONE" }
    }

    return {
      manager: candidates[0],
      source: "POSITION_HIERARCHY",
      ...(candidates.length > 1 ? { candidates } : {}),
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
}
