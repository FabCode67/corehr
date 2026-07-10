import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"

import { PrismaService } from "../../../prisma/prisma.service"

import { CreateBandDto } from "./dto/create-band.dto"
import { UpdateBandDto } from "./dto/update-band.dto"

@Injectable()
export class BandsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.band.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { rank: "asc" },
    })
  }

  async findOne(id: string) {
    const band = await this.prisma.band.findUnique({ where: { id } })

    if (!band) {
      throw new NotFoundException(`Band ${id} not found`)
    }

    return band
  }

  async create(dto: CreateBandDto) {
    await this.assertNameAndRankAvailable(dto.name, dto.rank)
    return this.prisma.band.create({ data: dto })
  }

  async update(id: string, dto: UpdateBandDto) {
    const current = await this.findOne(id)

    if (dto.name || dto.rank !== undefined) {
      await this.assertNameAndRankAvailable(dto.name ?? current.name, dto.rank ?? current.rank, id)
    }

    return this.prisma.band.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)

    // Soft delete — bands are referenced by PositionHistory, so historical
    // records must keep resolving to a real row.
    return this.prisma.band.update({ where: { id }, data: { isActive: false } })
  }

  private async assertNameAndRankAvailable(name: string, rank: number, excludeId?: string) {
    const existing = await this.prisma.band.findFirst({
      where: {
        OR: [{ name }, { rank }],
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    })

    if (existing) {
      throw new ConflictException("A band with this name or rank already exists")
    }
  }
}
