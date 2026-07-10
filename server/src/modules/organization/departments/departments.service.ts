import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"

import { PrismaService } from "../../../prisma/prisma.service"

import { CreateDepartmentDto } from "./dto/create-department.dto"
import { UpdateDepartmentDto } from "./dto/update-department.dto"

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(params: { functionId?: string; includeInactive?: boolean } = {}) {
    const { functionId, includeInactive = false } = params

    return this.prisma.department.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(functionId ? { functionId } : {}),
      },
      include: { function: true, units: { where: { isActive: true } } },
      orderBy: { name: "asc" },
    })
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        function: true,
        units: { where: { isActive: true } },
        positions: { where: { isActive: true, unitId: null } },
      },
    })

    if (!department) {
      throw new NotFoundException(`Department ${id} not found`)
    }

    return department
  }

  async create(dto: CreateDepartmentDto) {
    await this.assertFunctionExists(dto.functionId)
    await this.assertNameAvailable(dto.functionId, dto.name)

    return this.prisma.department.create({ data: dto })
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const current = await this.findOne(id)
    const functionId = dto.functionId ?? current.functionId

    if (dto.functionId) {
      await this.assertFunctionExists(dto.functionId)
    }

    if (dto.name) {
      await this.assertNameAvailable(functionId, dto.name, id)
    }

    return this.prisma.department.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)

    return this.prisma.department.update({
      where: { id },
      data: { isActive: false },
    })
  }

  private async assertFunctionExists(functionId: string) {
    const fn = await this.prisma.function.findUnique({ where: { id: functionId } })

    if (!fn) {
      throw new NotFoundException(`Function ${functionId} not found`)
    }
  }

  private async assertNameAvailable(functionId: string, name: string, excludeId?: string) {
    const existing = await this.prisma.department.findFirst({
      where: {
        functionId,
        name,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    })

    if (existing) {
      throw new ConflictException(
        `A department named "${name}" already exists under this function`
      )
    }
  }
}
