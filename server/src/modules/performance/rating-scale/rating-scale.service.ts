import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"

import { PrismaService } from "../../../prisma/prisma.service"

import { CreateRatingScaleDto } from "./dto/create-rating-scale.dto"
import { UpdateRatingScaleDto } from "./dto/update-rating-scale.dto"

/**
 * Data-driven 1-5 rating scale labels. Deliberately a lookup table rather
 * than a hardcoded enum so HR can retitle "Succeeded" -> "Meets Expectations"
 * (etc.) without a code change — same pattern as Bands/PositionLevels.
 * PerformanceReview.overallRating stores the plain rank Int, not an FK, so
 * editing a label here never touches historical review data.
 */
@Injectable()
export class RatingScaleService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.performanceRatingScale.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { rank: "desc" },
    })
  }

  async findOne(id: string) {
    const scale = await this.prisma.performanceRatingScale.findUnique({ where: { id } })

    if (!scale) {
      throw new NotFoundException(`Rating scale entry ${id} not found`)
    }

    return scale
  }

  async create(dto: CreateRatingScaleDto) {
    await this.assertRankAndLabelAvailable(dto.rank, dto.label)
    return this.prisma.performanceRatingScale.create({ data: dto })
  }

  async update(id: string, dto: UpdateRatingScaleDto) {
    const current = await this.findOne(id)

    if (dto.rank !== undefined || dto.label) {
      await this.assertRankAndLabelAvailable(dto.rank ?? current.rank, dto.label ?? current.label, id)
    }

    return this.prisma.performanceRatingScale.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)

    // Soft delete — reviews store the rank as a plain Int, not an FK, but we
    // still don't want to permanently destroy the label history.
    return this.prisma.performanceRatingScale.update({ where: { id }, data: { isActive: false } })
  }

  private async assertRankAndLabelAvailable(rank: number, label: string, excludeId?: string) {
    const existing = await this.prisma.performanceRatingScale.findFirst({
      where: {
        OR: [{ rank }, { label }],
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    })

    if (existing) {
      throw new ConflictException("A rating scale entry with this rank or label already exists")
    }
  }
}
