import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

import { CreateTrainingCategoryDto } from "./dto/create-training-category.dto"
import { UpdateTrainingCategoryDto } from "./dto/update-training-category.dto"

const CATEGORY_ORDER_BY = [{ isMandatory: "desc" as const }, { name: "asc" as const }]

@Injectable()
export class TrainingCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    const where: Prisma.TrainingCategoryWhereInput = includeInactive ? {} : { isActive: true }
    return this.prisma.trainingCategory.findMany({ where, orderBy: CATEGORY_ORDER_BY })
  }

  async findOne(id: string) {
    const category = await this.prisma.trainingCategory.findUnique({ where: { id } })
    if (!category) {
      throw new NotFoundException(`Training category ${id} not found`)
    }
    return category
  }

  async create(dto: CreateTrainingCategoryDto) {
    await this.assertNameAvailable(dto.name)
    return this.prisma.trainingCategory.create({ data: dto })
  }

  async update(id: string, dto: UpdateTrainingCategoryDto) {
    await this.findOne(id)
    if (dto.name) {
      await this.assertNameAvailable(dto.name, id)
    }
    return this.prisma.trainingCategory.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.trainingCategory.update({ where: { id }, data: { isActive: false } })
  }

  private async assertNameAvailable(name: string, excludeId?: string) {
    const existing = await this.prisma.trainingCategory.findFirst({
      where: { name, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    })
    if (existing) {
      throw new ConflictException(`A training category named "${name}" already exists`)
    }
  }
}
