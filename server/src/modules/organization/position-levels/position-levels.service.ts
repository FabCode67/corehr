import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"

import { PrismaService } from "../../../prisma/prisma.service"

import { CreatePositionLevelDto } from "./dto/create-position-level.dto"
import { UpdatePositionLevelDto } from "./dto/update-position-level.dto"

@Injectable()
export class PositionLevelsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.positionLevel.findMany({ orderBy: { rank: "asc" } })
  }

  async findOne(id: string) {
    const level = await this.prisma.positionLevel.findUnique({ where: { id } })

    if (!level) {
      throw new NotFoundException(`Position level ${id} not found`)
    }

    return level
  }

  async create(dto: CreatePositionLevelDto) {
    await this.assertNameRankCodeAvailable(dto.name, dto.rank, dto.code)
    return this.prisma.positionLevel.create({ data: dto })
  }

  async update(id: string, dto: UpdatePositionLevelDto) {
    await this.findOne(id)

    if (dto.name || dto.rank !== undefined || dto.code) {
      const current = await this.prisma.positionLevel.findUniqueOrThrow({ where: { id } })
      await this.assertNameRankCodeAvailable(
        dto.name ?? current.name,
        dto.rank ?? current.rank,
        dto.code ?? current.code ?? undefined,
        id
      )
    }

    return this.prisma.positionLevel.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)

    const inUse = await this.prisma.position.count({ where: { levelId: id, isActive: true } })
    if (inUse > 0) {
      throw new ConflictException(
        "Cannot remove a position level that is currently assigned to active positions"
      )
    }

    return this.prisma.positionLevel.delete({ where: { id } })
  }

  private async assertNameRankCodeAvailable(
    name: string,
    rank: number,
    code?: string,
    excludeId?: string
  ) {
    const existing = await this.prisma.positionLevel.findFirst({
      where: {
        OR: [{ name }, { rank }, ...(code ? [{ code }] : [])],
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    })

    if (existing) {
      throw new ConflictException("A position level with this name, rank, or code already exists")
    }
  }
}
