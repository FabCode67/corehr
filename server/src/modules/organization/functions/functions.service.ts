import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"

import { PrismaService } from "../../../prisma/prisma.service"

import { CreateFunctionDto } from "./dto/create-function.dto"
import { UpdateFunctionDto } from "./dto/update-function.dto"

@Injectable()
export class FunctionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.function.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: "asc" },
    })
  }

  async findOne(id: string) {
    const fn = await this.prisma.function.findUnique({
      where: { id },
      include: { departments: { where: { isActive: true } } },
    })

    if (!fn) {
      throw new NotFoundException(`Function ${id} not found`)
    }

    return fn
  }

  async create(dto: CreateFunctionDto) {
    await this.assertNameAvailable(dto.name)
    return this.prisma.function.create({ data: dto })
  }

  async update(id: string, dto: UpdateFunctionDto) {
    await this.findOne(id)

    if (dto.name) {
      await this.assertNameAvailable(dto.name, id)
    }

    return this.prisma.function.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)

    // Soft delete — a Function with historical departments/positions must
    // never be hard-deleted, or PositionHistory rows would dangle.
    return this.prisma.function.update({
      where: { id },
      data: { isActive: false },
    })
  }

  private async assertNameAvailable(name: string, excludeId?: string) {
    const existing = await this.prisma.function.findFirst({
      where: { name, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    })

    if (existing) {
      throw new ConflictException(`A function named "${name}" already exists`)
    }
  }
}
