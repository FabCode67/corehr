import { Injectable, NotFoundException } from "@nestjs/common"

import { PrismaService } from "../../../prisma/prisma.service"

import { CreateHolidayDto, UpdateHolidayDto } from "./dto/leave-policy.dto"

@Injectable()
export class PublicHolidaysService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.publicHoliday.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { date: "asc" },
    })
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
