import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

import { CreateExitDocumentTypeDto } from "./dto/create-exit-document-type.dto"
import { UpdateExitDocumentTypeDto } from "./dto/update-exit-document-type.dto"

const DOCUMENT_TYPE_ORDER_BY = [{ sortOrder: "asc" as const }, { name: "asc" as const }]

/**
 * HR-configurable exit checklist items (ID Card Returned, Laptop Returned,
 * IT Access Revoked, ...) — same data-driven lookup CRUD pattern as
 * OnboardingDocumentType. See schema.prisma's Exit Document Management
 * module note for why this is a simpler isCompleted checklist rather than
 * onboarding's upload/review workflow.
 */
@Injectable()
export class ExitDocumentTypesService {
  constructor(private readonly prisma: PrismaService) {}

  private buildFindAllWhere(includeInactive = false): Prisma.ExitDocumentTypeWhereInput {
    return includeInactive ? {} : { isActive: true }
  }

  findAll(includeInactive = false) {
    return this.prisma.exitDocumentType.findMany({ where: this.buildFindAllWhere(includeInactive), orderBy: DOCUMENT_TYPE_ORDER_BY })
  }

  async findOne(id: string) {
    const documentType = await this.prisma.exitDocumentType.findUnique({ where: { id } })
    if (!documentType) {
      throw new NotFoundException(`Exit document type ${id} not found`)
    }
    return documentType
  }

  async create(dto: CreateExitDocumentTypeDto) {
    await this.assertNameAvailable(dto.name)
    return this.prisma.exitDocumentType.create({ data: dto })
  }

  async update(id: string, dto: UpdateExitDocumentTypeDto) {
    await this.findOne(id)
    if (dto.name) {
      await this.assertNameAvailable(dto.name, id)
    }
    return this.prisma.exitDocumentType.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.exitDocumentType.update({ where: { id }, data: { isActive: false } })
  }

  private async assertNameAvailable(name: string, excludeId?: string) {
    const existing = await this.prisma.exitDocumentType.findFirst({
      where: { name, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    })
    if (existing) {
      throw new ConflictException(`An exit document type named "${name}" already exists`)
    }
  }
}
