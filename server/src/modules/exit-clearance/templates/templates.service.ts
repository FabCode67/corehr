import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

import { CreateClearanceFormTemplateDto } from "./dto/create-clearance-form-template.dto"
import { UpdateClearanceFormTemplateDto } from "./dto/update-clearance-form-template.dto"

const TEMPLATE_ORDER_BY = [{ sortOrder: "asc" as const }, { name: "asc" as const }]

const TEMPLATE_INCLUDE = {
  responsibleDepartment: { select: { id: true, name: true } },
  responsiblePosition: { select: { id: true, title: true } },
} as const

/**
 * HR-configurable Exit Clearance Form catalog — see schema.prisma's "EXIT
 * CLEARANCE WORKFLOW" module doc comment. Unlike the old ExitDocumentType
 * catalog it replaces, this one routes each form to a Department + Position
 * in the org structure rather than being a flat isCompleted checklist.
 */
@Injectable()
export class ClearanceFormTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private buildFindAllWhere(includeInactive = false): Prisma.ExitClearanceFormTemplateWhereInput {
    return includeInactive ? {} : { isActive: true }
  }

  findAll(includeInactive = false) {
    return this.prisma.exitClearanceFormTemplate.findMany({
      where: this.buildFindAllWhere(includeInactive),
      include: TEMPLATE_INCLUDE,
      orderBy: TEMPLATE_ORDER_BY,
    })
  }

  async findOne(id: string) {
    const template = await this.prisma.exitClearanceFormTemplate.findUnique({ where: { id }, include: TEMPLATE_INCLUDE })
    if (!template) {
      throw new NotFoundException(`Exit clearance form template ${id} not found`)
    }
    return template
  }

  async create(dto: CreateClearanceFormTemplateDto) {
    await this.assertNameAvailable(dto.name)
    await this.assertResponsiblePositionValid(dto.responsibleDepartmentId, dto.responsiblePositionId)
    this.assertAtLeastOneRequirement({
      requiresEmployeeCompletion: dto.requiresEmployeeCompletion ?? true,
      requiresConfirmation: dto.requiresConfirmation ?? true,
      requiresSignature: dto.requiresSignature ?? false,
    })

    return this.prisma.exitClearanceFormTemplate.create({ data: dto, include: TEMPLATE_INCLUDE })
  }

  async update(id: string, dto: UpdateClearanceFormTemplateDto) {
    const current = await this.findOne(id)

    if (dto.name) {
      await this.assertNameAvailable(dto.name, id)
    }

    const responsibleDepartmentId = dto.responsibleDepartmentId ?? current.responsibleDepartmentId
    const responsiblePositionId = dto.responsiblePositionId ?? current.responsiblePositionId
    if (dto.responsibleDepartmentId !== undefined || dto.responsiblePositionId !== undefined) {
      await this.assertResponsiblePositionValid(responsibleDepartmentId, responsiblePositionId)
    }

    this.assertAtLeastOneRequirement({
      requiresEmployeeCompletion: dto.requiresEmployeeCompletion ?? current.requiresEmployeeCompletion,
      requiresConfirmation: dto.requiresConfirmation ?? current.requiresConfirmation,
      requiresSignature: dto.requiresSignature ?? current.requiresSignature,
    })

    return this.prisma.exitClearanceFormTemplate.update({ where: { id }, data: dto, include: TEMPLATE_INCLUDE })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.exitClearanceFormTemplate.update({ where: { id }, data: { isActive: false } })
  }

  private async assertNameAvailable(name: string, excludeId?: string) {
    const existing = await this.prisma.exitClearanceFormTemplate.findFirst({
      where: { name, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    })
    if (existing) {
      throw new ConflictException(`An exit clearance form named "${name}" already exists`)
    }
  }

  /** The responsible position must genuinely belong to the responsible
   *  department — routing a form to "Security Manager" but filing it under
   *  the IT department would silently break the "any current employee
   *  occupying that position" resolution this whole feature is built on. */
  private async assertResponsiblePositionValid(departmentId: string, positionId: string) {
    const department = await this.prisma.department.findUnique({ where: { id: departmentId } })
    if (!department) {
      throw new NotFoundException(`Department ${departmentId} not found`)
    }

    const position = await this.prisma.position.findUnique({ where: { id: positionId } })
    if (!position) {
      throw new NotFoundException(`Position ${positionId} not found`)
    }
    if (position.departmentId !== departmentId) {
      throw new BadRequestException(`Position "${position.title}" does not belong to the selected department.`)
    }
  }

  /** A form with none of the three requirement flags set would never have
   *  anything to complete — nothing would ever move it out of PENDING. */
  private assertAtLeastOneRequirement(flags: { requiresEmployeeCompletion: boolean; requiresConfirmation: boolean; requiresSignature: boolean }) {
    if (!flags.requiresEmployeeCompletion && !flags.requiresConfirmation && !flags.requiresSignature) {
      throw new BadRequestException("At least one of employee completion, confirmation, or signature must be required.")
    }
  }
}
