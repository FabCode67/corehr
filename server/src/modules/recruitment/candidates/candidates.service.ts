import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../../common/pagination"
import { PrismaService } from "../../../prisma/prisma.service"

import { CreateCandidateDto } from "./dto/create-candidate.dto"
import { UpdateCandidateDto } from "./dto/update-candidate.dto"

const CANDIDATE_ORDER_BY = [{ createdAt: "desc" as const }]

@Injectable()
export class CandidatesService {
  constructor(private readonly prisma: PrismaService) {}

  private buildFindAllWhere(search?: string): Prisma.CandidateWhereInput {
    if (!search) return {}
    return {
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }
  }

  findAll(search?: string) {
    return this.prisma.candidate.findMany({ where: this.buildFindAllWhere(search), orderBy: CANDIDATE_ORDER_BY })
  }

  async findAllPaginated(search?: string, page?: number, pageSize?: number): Promise<PaginatedResult<unknown>> {
    const where = this.buildFindAllWhere(search)
    const { skip, take, page: normalizedPage, pageSize: normalizedPageSize } = normalizePagination(page, pageSize)

    const [data, total] = await this.prisma.$transaction([
      this.prisma.candidate.findMany({ where, orderBy: CANDIDATE_ORDER_BY, skip, take }),
      this.prisma.candidate.count({ where }),
    ])

    return buildPaginatedResult(data, total, normalizedPage, normalizedPageSize)
  }

  async findOne(id: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: {
        applications: {
          include: { jobPosting: { select: { id: true, postingTitle: true, status: true } } },
          orderBy: { appliedAt: "desc" },
        },
      },
    })
    if (!candidate) {
      throw new NotFoundException(`Candidate ${id} not found`)
    }
    return candidate
  }

  async create(dto: CreateCandidateDto) {
    await this.assertEmailAvailable(dto.email)
    return this.prisma.candidate.create({ data: dto })
  }

  async update(id: string, dto: UpdateCandidateDto) {
    await this.findOne(id)
    if (dto.email) {
      await this.assertEmailAvailable(dto.email, id)
    }
    return this.prisma.candidate.update({ where: { id }, data: dto })
  }

  private async assertEmailAvailable(email: string, excludeId?: string) {
    const existing = await this.prisma.candidate.findFirst({
      where: { email, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    })
    if (existing) {
      throw new ConflictException(`A candidate with email "${email}" already exists`)
    }
  }
}
