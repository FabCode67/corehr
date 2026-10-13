import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../../common/pagination"
import { PrismaService } from "../../../prisma/prisma.service"

import { buildJdDocx } from "./jd-docx"
import { contentFromFlat, flatFromContent, normalizeJdContent, type JdContent } from "./jd-content"
import { SaveJobDescriptionDto } from "./dto/save-job-description.dto"
import { CreateJobDescriptionDto } from "./dto/create-job-description.dto"
import { UpdateJobDescriptionDto } from "./dto/update-job-description.dto"

const JOB_DESCRIPTION_ORDER_BY = [{ jobTitle: "asc" as const }]

const JOB_DESCRIPTION_INCLUDE = {
  requiredLevel: { select: { id: true, name: true } },
  requiredBand: { select: { id: true, name: true } },
  reportingManagerPosition: { select: { id: true, title: true } },
} as const

@Injectable()
export class JobDescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildFindAllWhere(includeInactive = false): Prisma.JobDescriptionWhereInput {
    return includeInactive ? {} : { isActive: true }
  }

  findAll(includeInactive = false) {
    return this.prisma.jobDescription.findMany({
      where: this.buildFindAllWhere(includeInactive),
      include: JOB_DESCRIPTION_INCLUDE,
      orderBy: JOB_DESCRIPTION_ORDER_BY,
    })
  }

  async findAllPaginated(includeInactive = false, page?: number, pageSize?: number): Promise<PaginatedResult<unknown>> {
    const where = this.buildFindAllWhere(includeInactive)
    const { skip, take, page: normalizedPage, pageSize: normalizedPageSize } = normalizePagination(page, pageSize)

    const [data, total] = await this.prisma.$transaction([
      this.prisma.jobDescription.findMany({ where, include: JOB_DESCRIPTION_INCLUDE, orderBy: JOB_DESCRIPTION_ORDER_BY, skip, take }),
      this.prisma.jobDescription.count({ where }),
    ])

    return buildPaginatedResult(data, total, normalizedPage, normalizedPageSize)
  }

  async findOne(id: string) {
    const jobDescription = await this.prisma.jobDescription.findUnique({ where: { id }, include: JOB_DESCRIPTION_INCLUDE })
    if (!jobDescription) {
      throw new NotFoundException(`Job description ${id} not found`)
    }
    return jobDescription
  }

  create(dto: CreateJobDescriptionDto) {
    return this.prisma.jobDescription.create({ data: dto, include: JOB_DESCRIPTION_INCLUDE })
  }

  async update(id: string, dto: UpdateJobDescriptionDto) {
    await this.findOne(id)
    return this.prisma.jobDescription.update({ where: { id }, data: dto, include: JOB_DESCRIPTION_INCLUDE })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.jobDescription.update({ where: { id }, data: { isActive: false }, include: JOB_DESCRIPTION_INCLUDE })
  }

  /** Content in template shape — stored content, or derived for legacy JDs. */
  contentOf(jd: { content: unknown; jobTitle: string; jobSummary: string; keyResponsibilities: string; requiredQualifications: string; requiredCertifications: string | null; requiredExperience: string | null; technicalCompetencies: string | null; behaviouralCompetencies: string | null }): JdContent {
    return jd.content ? normalizeJdContent(jd.content) : contentFromFlat(jd)
  }

  async getStructured(id: string) {
    const jd = await this.findOne(id)
    return { ...jd, content: this.contentOf(jd) }
  }

  /** Most recent active JD written for this position — the "reuse" source. */
  async latestForPosition(positionId: string) {
    const jd = await this.prisma.jobDescription.findFirst({
      where: { positionId, isActive: true },
      orderBy: { createdAt: "desc" },
      include: JOB_DESCRIPTION_INCLUDE,
    })
    return jd ? { ...jd, content: this.contentOf(jd) } : null
  }

  /** Creates a new JD from structured content. Reuse = save a customised copy
   *  of an earlier JD's content; the earlier one is left untouched. */
  async createStructured(dto: SaveJobDescriptionDto) {
    const content = normalizeJdContent(dto.content)
    if (!content.header.jobTitle.trim()) throw new BadRequestException("Job title is required.")
    const created = await this.prisma.jobDescription.create({
      data: {
        ...flatFromContent(content),
        content: content as unknown as Prisma.InputJsonValue,
        positionId: dto.positionId,
        requiredBandId: dto.requiredBandId,
        createdById: dto.actingEmployeeId,
      },
      include: JOB_DESCRIPTION_INCLUDE,
    })
    if (dto.requisitionId) {
      await this.prisma.jobRequisition.update({ where: { id: dto.requisitionId }, data: { jobDescriptionId: created.id } })
      await this.prisma.recruitmentAuditLog.create({
        data: { entityType: "JobRequisition", entityId: dto.requisitionId, action: "JD_ATTACHED", actorId: dto.actingEmployeeId ?? null, notes: created.jobTitle },
      })
    }
    return created
  }

  async updateStructured(id: string, dto: SaveJobDescriptionDto) {
    await this.findOne(id)
    const content = normalizeJdContent(dto.content)
    if (!content.header.jobTitle.trim()) throw new BadRequestException("Job title is required.")
    return this.prisma.jobDescription.update({
      where: { id },
      data: {
        ...flatFromContent(content),
        content: content as unknown as Prisma.InputJsonValue,
        ...(dto.positionId ? { positionId: dto.positionId } : {}),
        ...(dto.requiredBandId ? { requiredBandId: dto.requiredBandId } : {}),
      },
      include: JOB_DESCRIPTION_INCLUDE,
    })
  }

  async renderDocx(id: string) {
    const jd = await this.findOne(id)
    const content = this.contentOf(jd)
    return { buffer: await buildJdDocx(content), fileName: `JD - ${content.header.jobTitle || "Job Description"}.docx` }
  }
}
