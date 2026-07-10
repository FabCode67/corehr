import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"

import { PrismaService } from "../../../prisma/prisma.service"

import { CreateUnitDto } from "./dto/create-unit.dto"
import { UpdateUnitDto } from "./dto/update-unit.dto"

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(params: { departmentId?: string; includeInactive?: boolean } = {}) {
    const { departmentId, includeInactive = false } = params

    return this.prisma.unit.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(departmentId ? { departmentId } : {}),
      },
      include: { department: true },
      orderBy: { name: "asc" },
    })
  }

  async findOne(id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: {
        department: true,
        positions: { where: { isActive: true } },
      },
    })

    if (!unit) {
      throw new NotFoundException(`Unit ${id} not found`)
    }

    return unit
  }

  async create(dto: CreateUnitDto) {
    await this.assertDepartmentExists(dto.departmentId)
    await this.assertNameAvailable(dto.departmentId, dto.name)

    return this.prisma.unit.create({ data: dto })
  }

  async update(id: string, dto: UpdateUnitDto) {
    const current = await this.findOne(id)
    const departmentId = dto.departmentId ?? current.departmentId

    if (dto.departmentId) {
      await this.assertDepartmentExists(dto.departmentId)
    }

    if (dto.name) {
      await this.assertNameAvailable(departmentId, dto.name, id)
    }

    return this.prisma.unit.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)

    return this.prisma.unit.update({ where: { id }, data: { isActive: false } })
  }

  private async assertDepartmentExists(departmentId: string) {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
    })

    if (!department) {
      throw new NotFoundException(`Department ${departmentId} not found`)
    }
  }

  private async assertNameAvailable(departmentId: string, name: string, excludeId?: string) {
    const existing = await this.prisma.unit.findFirst({
      where: {
        departmentId,
        name,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    })

    if (existing) {
      throw new ConflictException(`A unit named "${name}" already exists in this department`)
    }
  }
}
