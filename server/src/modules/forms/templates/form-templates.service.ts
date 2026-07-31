import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"

import { FormStatus, Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

import { CreateFormFieldDto } from "./dto/create-form-field.dto"
import { CreateFormTemplateDto } from "./dto/create-form-template.dto"
import { CreateSignatureStageDto } from "./dto/create-signature-stage.dto"
import { ReorderFieldsDto } from "./dto/reorder-fields.dto"
import { UpdateFormFieldDto } from "./dto/update-form-field.dto"
import { UpdateFormTemplateDto } from "./dto/update-form-template.dto"
import { UpdateSignatureStageDto } from "./dto/update-signature-stage.dto"

export const FORM_TEMPLATE_INCLUDE = {
  category: true,
  applicableDepartment: { select: { id: true, name: true } },
  createdBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
  fields: { orderBy: { order: "asc" as const } },
  signatureStages: {
    orderBy: { stageOrder: "asc" as const },
    include: { specificApprover: { select: { employeeNumber: true, firstName: true, lastName: true } } },
  },
} as const

export interface FormTemplateFilters {
  categoryId?: string
  status?: string
}

@Injectable()
export class FormTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: FormTemplateFilters) {
    const where: Prisma.FormTemplateWhereInput = {
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.status ? { status: filters.status as FormStatus } : {}),
    }
    return this.prisma.formTemplate.findMany({ where, include: FORM_TEMPLATE_INCLUDE, orderBy: { title: "asc" } })
  }

  async findOne(id: string) {
    const template = await this.prisma.formTemplate.findUnique({ where: { id }, include: FORM_TEMPLATE_INCLUDE })
    if (!template) {
      throw new NotFoundException(`Form template ${id} not found`)
    }
    return template
  }

  create(dto: CreateFormTemplateDto) {
    return this.prisma.formTemplate.create({ data: dto, include: FORM_TEMPLATE_INCLUDE })
  }

  async update(id: string, dto: UpdateFormTemplateDto) {
    await this.findOne(id)
    return this.prisma.formTemplate.update({ where: { id }, data: dto, include: FORM_TEMPLATE_INCLUDE })
  }

  async publish(id: string) {
    const template = await this.findOne(id)
    if (template.status !== "DRAFT") {
      throw new BadRequestException("Only a draft template can be published.")
    }
    return this.prisma.formTemplate.update({ where: { id }, data: { status: "ACTIVE" }, include: FORM_TEMPLATE_INCLUDE })
  }

  async archive(id: string) {
    const template = await this.findOne(id)
    if (template.status !== "ACTIVE") {
      throw new BadRequestException("Only an active template can be archived.")
    }
    return this.prisma.formTemplate.update({ where: { id }, data: { status: "ARCHIVED" }, include: FORM_TEMPLATE_INCLUDE })
  }

  /** Clones this template's fields/stages into a new DRAFT row at
   *  version + 1 and archives the current one — see schema's module doc
   *  comment on FormTemplate.rootTemplateId for why edits to a template
   *  with existing instances go through this instead of in-place field
   *  edits. */
  async createNewVersion(id: string) {
    const template = await this.findOne(id)
    const rootTemplateId = template.rootTemplateId ?? template.id

    const created = await this.prisma.$transaction(async (tx) => {
      const newVersion = await tx.formTemplate.create({
        data: {
          title: template.title,
          formCode: `${template.formCode}-v${template.version + 1}`,
          description: template.description,
          purpose: template.purpose,
          categoryId: template.categoryId,
          requirementsInstructions: template.requirementsInstructions,
          applicableDepartmentId: template.applicableDepartmentId,
          applicableEmployeeCategory: template.applicableEmployeeCategory,
          status: "DRAFT",
          version: template.version + 1,
          rootTemplateId,
          createdById: template.createdById,
          fields: {
            create: template.fields.map((field) => ({
              fieldType: field.fieldType,
              label: field.label,
              helpText: field.helpText,
              isRequired: field.isRequired,
              order: field.order,
              options: field.options ?? undefined,
              tableColumns: field.tableColumns ?? undefined,
            })),
          },
          signatureStages: {
            create: template.signatureStages.map((stage) => ({
              stageOrder: stage.stageOrder,
              role: stage.role,
              specificApproverId: stage.specificApproverId,
              label: stage.label,
            })),
          },
        },
        include: FORM_TEMPLATE_INCLUDE,
      })

      await tx.formTemplate.update({ where: { id: template.id }, data: { status: "ARCHIVED" } })

      return newVersion
    })

    return created
  }

  // ---- Fields ---------------------------------------------------------------

  async addField(templateId: string, dto: CreateFormFieldDto) {
    await this.assertStructurallyEditable(templateId)
    return this.prisma.formField.create({
      data: {
        formTemplateId: templateId,
        ...dto,
        options: (dto.options ?? undefined) as Prisma.InputJsonValue | undefined,
        tableColumns: (dto.tableColumns ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    })
  }

  async updateField(templateId: string, fieldId: string, dto: UpdateFormFieldDto) {
    await this.assertStructurallyEditable(templateId)
    await this.assertFieldBelongsToTemplate(templateId, fieldId)
    return this.prisma.formField.update({
      where: { id: fieldId },
      data: {
        ...dto,
        options: (dto.options ?? undefined) as Prisma.InputJsonValue | undefined,
        tableColumns: (dto.tableColumns ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    })
  }

  async removeField(templateId: string, fieldId: string) {
    await this.assertStructurallyEditable(templateId)
    await this.assertFieldBelongsToTemplate(templateId, fieldId)
    await this.prisma.formField.delete({ where: { id: fieldId } })
  }

  async reorderFields(templateId: string, dto: ReorderFieldsDto) {
    await this.assertStructurallyEditable(templateId)
    await this.prisma.$transaction(
      dto.fieldIds.map((fieldId, index) =>
        this.prisma.formField.updateMany({ where: { id: fieldId, formTemplateId: templateId }, data: { order: index } })
      )
    )
    return this.findOne(templateId)
  }

  // ---- Signature stages -------------------------------------------------------

  async addStage(templateId: string, dto: CreateSignatureStageDto) {
    await this.assertStructurallyEditable(templateId)
    return this.prisma.formSignatureStage.create({ data: { formTemplateId: templateId, ...dto } })
  }

  async updateStage(templateId: string, stageId: string, dto: UpdateSignatureStageDto) {
    await this.assertStructurallyEditable(templateId)
    await this.assertStageBelongsToTemplate(templateId, stageId)
    return this.prisma.formSignatureStage.update({ where: { id: stageId }, data: dto })
  }

  async removeStage(templateId: string, stageId: string) {
    await this.assertStructurallyEditable(templateId)
    await this.assertStageBelongsToTemplate(templateId, stageId)
    await this.prisma.formSignatureStage.delete({ where: { id: stageId } })
  }

  private async assertStructurallyEditable(templateId: string) {
    await this.findOne(templateId)
    const instanceCount = await this.prisma.formInstance.count({ where: { formTemplateId: templateId } })
    if (instanceCount > 0) {
      throw new BadRequestException(
        "This template already has assigned form instances — its fields and signature stages are locked. Create a new version to make structural changes."
      )
    }
  }

  private async assertFieldBelongsToTemplate(templateId: string, fieldId: string) {
    const field = await this.prisma.formField.findUnique({ where: { id: fieldId } })
    if (!field || field.formTemplateId !== templateId) {
      throw new NotFoundException(`Field ${fieldId} not found on this template`)
    }
  }

  private async assertStageBelongsToTemplate(templateId: string, stageId: string) {
    const stage = await this.prisma.formSignatureStage.findUnique({ where: { id: stageId } })
    if (!stage || stage.formTemplateId !== templateId) {
      throw new NotFoundException(`Signature stage ${stageId} not found on this template`)
    }
  }
}
