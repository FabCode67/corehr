import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"
import { CreateEmailTemplateDto } from "./dto/create-email-template.dto"
import { UpdateEmailTemplateDto } from "./dto/update-email-template.dto"

@Injectable()
export class EmailTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(category?: string) {
    return this.prisma.emailTemplate.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    })
  }

  async findOne(id: string) {
    const template = await this.prisma.emailTemplate.findUnique({ where: { id } })
    if (!template) throw new NotFoundException(`Email template ${id} not found.`)
    return template
  }

  async create(dto: CreateEmailTemplateDto) {
    const existing = await this.prisma.emailTemplate.findUnique({ where: { key: dto.key } })
    if (existing) throw new ConflictException(`An email template with key "${dto.key}" already exists.`)

    return this.prisma.emailTemplate.create({
      data: {
        key: dto.key,
        name: dto.name,
        category: dto.category,
        subject: dto.subject,
        bodyHtml: dto.bodyHtml,
        variables: dto.variables ?? [],
        isActive: dto.isActive ?? true,
        isMandatory: dto.isMandatory ?? false,
        createdById: dto.createdById,
      },
    })
  }

  async update(id: string, dto: UpdateEmailTemplateDto) {
    await this.findOne(id)
    try {
      return await this.prisma.emailTemplate.update({
        where: { id },
        data: {
          name: dto.name,
          category: dto.category,
          subject: dto.subject,
          bodyHtml: dto.bodyHtml,
          variables: dto.variables,
          isActive: dto.isActive,
          isMandatory: dto.isMandatory,
        },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("An email template with that key already exists.")
      }
      throw error
    }
  }

  /** Templates are referenced by historical EmailLog rows (templateKey, not id-cascaded),
   *  so deactivating is offered as the safe default — but a hard delete is still exposed
   *  for admins who created a template by mistake and it was never actually used. */
  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.emailTemplate.delete({ where: { id } })
  }
}
