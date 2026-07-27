import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../../common/pagination"
import { PrismaService } from "../../../prisma/prisma.service"

import { CreateInstitutionDto } from "./dto/create-institution.dto"
import { UpdateInstitutionDto } from "./dto/update-institution.dto"

const INSTITUTION_ORDER_BY = [{ name: "asc" as const }]

@Injectable()
export class InstitutionsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildFindAllWhere(includeInactive = false): Prisma.InstitutionWhereInput {
    return includeInactive ? {} : { isActive: true }
  }

  findAll(includeInactive = false) {
    return this.prisma.institution.findMany({
      where: this.buildFindAllWhere(includeInactive),
      orderBy: INSTITUTION_ORDER_BY,
    })
  }

  async findAllPaginated(
    includeInactive = false,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResult<Prisma.InstitutionGetPayload<object>>> {
    const where = this.buildFindAllWhere(includeInactive)
    const { skip, take, page: normalizedPage, pageSize: normalizedPageSize } = normalizePagination(page, pageSize)

    const [data, total] = await this.prisma.$transaction([
      this.prisma.institution.findMany({ where, orderBy: INSTITUTION_ORDER_BY, skip, take }),
      this.prisma.institution.count({ where }),
    ])

    return buildPaginatedResult(data, total, normalizedPage, normalizedPageSize)
  }

  async findOne(id: string) {
    const institution = await this.prisma.institution.findUnique({ where: { id } })
    if (!institution) {
      throw new NotFoundException(`Institution ${id} not found`)
    }
    return institution
  }

  async create(dto: CreateInstitutionDto) {
    await this.assertNameAvailable(dto.name)
    return this.prisma.institution.create({ data: dto })
  }

  async update(id: string, dto: UpdateInstitutionDto) {
    await this.findOne(id)
    if (dto.name) {
      await this.assertNameAvailable(dto.name, id)
    }
    return this.prisma.institution.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.institution.update({ where: { id }, data: { isActive: false } })
  }

  private async assertNameAvailable(name: string, excludeId?: string) {
    const existing = await this.prisma.institution.findFirst({
      where: { name, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    })
    if (existing) {
      throw new ConflictException(`An institution named "${name}" already exists`)
    }
  }
}
