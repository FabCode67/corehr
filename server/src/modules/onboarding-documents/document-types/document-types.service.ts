import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

import { CreateDocumentTypeDto } from "./dto/create-document-type.dto"
import { UpdateDocumentTypeDto } from "./dto/update-document-type.dto"

const DOCUMENT_TYPE_ORDER_BY = [{ name: "asc" as const }]

/**
 * HR-configurable onboarding document requirements (Employment Contract,
 * National ID, AML Declaration, ...) — same data-driven lookup CRUD pattern
 * as SanctionType/FormCategory/TrainingCategory, so HR can add more without
 * a code change. See schema.prisma's Onboarding Document Management module
 * note for why applicability (contract type/function/department/position/
 * band) is a set of plain arrays rather than join tables.
 */
@Injectable()
export class DocumentTypesService {
  constructor(private readonly prisma: PrismaService) {}

  private buildFindAllWhere(includeInactive = false): Prisma.OnboardingDocumentTypeWhereInput {
    return includeInactive ? {} : { isActive: true }
  }

  findAll(includeInactive = false) {
    return this.prisma.onboardingDocumentType.findMany({ where: this.buildFindAllWhere(includeInactive), orderBy: DOCUMENT_TYPE_ORDER_BY })
  }

  async findOne(id: string) {
    const documentType = await this.prisma.onboardingDocumentType.findUnique({ where: { id } })
    if (!documentType) {
      throw new NotFoundException(`Onboarding document type ${id} not found`)
    }
    return documentType
  }

  /** Documents that apply to this employee's profile — union of the
   *  "applies to everyone" case (empty array on a dimension) and an exact
   *  match on any dimension that IS restricted. Used to pre-suggest
   *  documents on the registration wizard; HR's final selection is always
   *  explicit (see schema module note). */
  async findApplicable(profile: { contractType?: string | null; functionId?: string | null; departmentId?: string | null; positionId?: string | null; bandId?: string | null }) {
    const types = await this.prisma.onboardingDocumentType.findMany({ where: { isActive: true }, orderBy: DOCUMENT_TYPE_ORDER_BY })
    return types.filter((type) => {
      if (type.applicableContractTypes.length > 0 && (!profile.contractType || !type.applicableContractTypes.includes(profile.contractType as never))) return false
      if (type.applicableFunctionIds.length > 0 && (!profile.functionId || !type.applicableFunctionIds.includes(profile.functionId))) return false
      if (type.applicableDepartmentIds.length > 0 && (!profile.departmentId || !type.applicableDepartmentIds.includes(profile.departmentId))) return false
      if (type.applicablePositionIds.length > 0 && (!profile.positionId || !type.applicablePositionIds.includes(profile.positionId))) return false
      if (type.applicableBandIds.length > 0 && (!profile.bandId || !type.applicableBandIds.includes(profile.bandId))) return false
      return true
    })
  }

  async create(dto: CreateDocumentTypeDto) {
    await this.assertNameAvailable(dto.name)
    return this.prisma.onboardingDocumentType.create({ data: dto })
  }

  async update(id: string, dto: UpdateDocumentTypeDto) {
    await this.findOne(id)
    if (dto.name) {
      await this.assertNameAvailable(dto.name, id)
    }
    return this.prisma.onboardingDocumentType.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.onboardingDocumentType.update({ where: { id }, data: { isActive: false } })
  }

  private async assertNameAvailable(name: string, excludeId?: string) {
    const existing = await this.prisma.onboardingDocumentType.findFirst({
      where: { name, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    })
    if (existing) {
      throw new ConflictException(`An onboarding document type named "${name}" already exists`)
    }
  }
}
