import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

import { CreateSanctionTypeDto } from "./dto/create-sanction-type.dto"
import { UpdateSanctionTypeDto } from "./dto/update-sanction-type.dto"

const SANCTION_TYPE_ORDER_BY = [{ name: "asc" as const }]

@Injectable()
export class SanctionTypesService {
  constructor(private readonly prisma: PrismaService) {}

  private buildFindAllWhere(includeInactive = false): Prisma.SanctionTypeWhereInput {
    return includeInactive ? {} : { isActive: true }
  }

  findAll(includeInactive = false) {
    return this.prisma.sanctionType.findMany({ where: this.buildFindAllWhere(includeInactive), orderBy: SANCTION_TYPE_ORDER_BY })
  }

  async findOne(id: string) {
    const sanctionType = await this.prisma.sanctionType.findUnique({ where: { id } })
    if (!sanctionType) {
      throw new NotFoundException(`Sanction type ${id} not found`)
    }
    return sanctionType
  }

  async create(dto: CreateSanctionTypeDto) {
    await this.assertNameAvailable(dto.name)
    return this.prisma.sanctionType.create({ data: dto })
  }

  async update(id: string, dto: UpdateSanctionTypeDto) {
    await this.findOne(id)
    if (dto.name) {
      await this.assertNameAvailable(dto.name, id)
    }
    return this.prisma.sanctionType.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.sanctionType.update({ where: { id }, data: { isActive: false } })
  }

  private async assertNameAvailable(name: string, excludeId?: string) {
    const existing = await this.prisma.sanctionType.findFirst({
      where: { name, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    })
    if (existing) {
      throw new ConflictException(`A sanction type named "${name}" already exists`)
    }
  }
}
