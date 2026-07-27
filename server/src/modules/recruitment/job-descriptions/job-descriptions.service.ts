import { Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../../common/pagination"
import { PrismaService } from "../../../prisma/prisma.service"

import { CreateJobDescriptionDto } from "./dto/create-job-description.dto"
import { UpdateJobDescriptionDto } from "./dto/update-job-description.dto"

const JOB_DESCRIPTION_ORDER_BY = [{ jobTitle: "asc" as const }]

const JOB_DESCRIPTION_INCLUDE = {
  requiredLevel: { select: { id: true, name: true } },
  requiredBand: { select: { id: true, name: true } },
  reportingManager: { select: { employeeNumber: true, firstName: true, lastName: true } },
} as const

@Injectable()
export class JobDescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildFindAllWhere(includeInactive = false): Prisma.JobDescriptionWhereInput {
    return includeInactive ? {} : { isActive: true }
  }

  findAll(includeInactive = false) {
    return this.prisma.jobDescription.findMany({
      where: this.buildFindAllWhere(includeInactive),
      include: JOB_DESCRIPTION_INCLUDE,
      orderBy: JOB_DESCRIPTION_ORDER_BY,
    })
  }

  async findAllPaginated(includeInactive = false, page?: number, pageSize?: number): Promise<PaginatedResult<unknown>> {
    const where = this.buildFindAllWhere(includeInactive)
    const { skip, take, page: normalizedPage, pageSize: normalizedPageSize } = normalizePagination(page, pageSize)

    const [data, total] = await this.prisma.$transaction([
      this.prisma.jobDescription.findMany({ where, include: JOB_DESCRIPTION_INCLUDE, orderBy: JOB_DESCRIPTION_ORDER_BY, skip, take }),
      this.prisma.jobDescription.count({ where }),
    ])

    return buildPaginatedResult(data, total, normalizedPage, normalizedPageSize)
  }

  async findOne(id: string) {
    const jobDescription = await this.prisma.jobDescription.findUnique({ where: { id }, include: JOB_DESCRIPTION_INCLUDE })
    if (!jobDescription) {
      throw new NotFoundException(`Job description ${id} not found`)
    }
    return jobDescription
  }

  create(dto: CreateJobDescriptionDto) {
    return this.prisma.jobDescription.create({ data: dto, include: JOB_DESCRIPTION_INCLUDE })
  }

  async update(id: string, dto: UpdateJobDescriptionDto) {
    await this.findOne(id)
    return this.prisma.jobDescription.update({ where: { id }, data: dto, include: JOB_DESCRIPTION_INCLUDE })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.jobDescription.update({ where: { id }, data: { isActive: false }, include: JOB_DESCRIPTION_INCLUDE })
  }
}
