import { Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../../common/pagination"
import { PrismaService } from "../../../prisma/prisma.service"

import { CreateHolidayDto, UpdateHolidayDto } from "./dto/leave-policy.dto"

@Injectable()
export class PublicHolidaysService {
  constructor(private readonly prisma: PrismaService) {}

  /** Full, unpaginated list — used by leave-day calculations and any
   *  dropdowns. See findAllPaginated() for the admin table view. */
  findAll(includeInactive = false) {
    return this.prisma.publicHoliday.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { date: "asc" },
    })
  }

  /** Paginated version for the Leave Settings holidays table. */
  async findAllPaginated(
    includeInactive = false,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResult<Prisma.PublicHolidayGetPayload<object>>> {
    const where: Prisma.PublicHolidayWhereInput | undefined = includeInactive ? undefined : { isActive: true }
    const { skip, take, page: normalizedPage, pageSize: normalizedPageSize } = normalizePagination(
      page,
      pageSize
    )

    const [data, total] = await this.prisma.$transaction([
      this.prisma.publicHoliday.findMany({ where, orderBy: { date: "asc" }, skip, take }),
      this.prisma.publicHoliday.count({ where }),
    ])

    return buildPaginatedResult(data, total, normalizedPage, normalizedPageSize)
  }

  async findOne(id: string) {
    const holiday = await this.prisma.publicHoliday.findUnique({ where: { id } })
    if (!holiday) {
      throw new NotFoundException(`Public holiday ${id} not found`)
    }
    return holiday
  }

  create(dto: CreateHolidayDto) {
    return this.prisma.publicHoliday.create({ data: dto })
  }

  async update(id: string, dto: UpdateHolidayDto) {
    await this.findOne(id)
    return this.prisma.publicHoliday.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.publicHoliday.update({ where: { id }, data: { isActive: false } })
  }
}
