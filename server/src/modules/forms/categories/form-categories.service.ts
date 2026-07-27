import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

import { CreateFormCategoryDto } from "./dto/create-form-category.dto"
import { UpdateFormCategoryDto } from "./dto/update-form-category.dto"

const CATEGORY_ORDER_BY = [{ name: "asc" as const }]

@Injectable()
export class FormCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private buildFindAllWhere(includeInactive = false): Prisma.FormCategoryWhereInput {
    return includeInactive ? {} : { isActive: true }
  }

  findAll(includeInactive = false) {
    return this.prisma.formCategory.findMany({ where: this.buildFindAllWhere(includeInactive), orderBy: CATEGORY_ORDER_BY })
  }

  async findOne(id: string) {
    const category = await this.prisma.formCategory.findUnique({ where: { id } })
    if (!category) {
      throw new NotFoundException(`Form category ${id} not found`)
    }
    return category
  }

  async create(dto: CreateFormCategoryDto) {
    await this.assertNameAvailable(dto.name)
    return this.prisma.formCategory.create({ data: dto })
  }

  async update(id: string, dto: UpdateFormCategoryDto) {
    await this.findOne(id)
    if (dto.name) {
      await this.assertNameAvailable(dto.name, id)
    }
    return this.prisma.formCategory.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.formCategory.update({ where: { id }, data: { isActive: false } })
  }

  private async assertNameAvailable(name: string, excludeId?: string) {
    const existing = await this.prisma.formCategory.findFirst({
      where: { name, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    })
    if (existing) {
      throw new ConflictException(`A form category named "${name}" already exists`)
    }
  }
}
