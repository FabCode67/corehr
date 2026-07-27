import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../common/pagination"
import { PrismaService } from "../../prisma/prisma.service"

import { CreateBranchDto } from "./dto/create-branch.dto"
import { UpdateBranchDto } from "./dto/update-branch.dto"

const BRANCH_ORDER_BY = [{ isHeadquarters: "desc" as const }, { name: "asc" as const }]

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  private buildFindAllWhere(includeInactive = false): Prisma.BranchWhereInput {
    return includeInactive ? {} : { isActive: true }
  }

  /** Full, unpaginated list — used by the employee form, leave filters
   *  (approvals/calendar/analytics), and anywhere else a complete branch
   *  picker is needed. See findAllPaginated() for the admin table view. */
  findAll(includeInactive = false) {
    return this.prisma.branch.findMany({
      where: this.buildFindAllWhere(includeInactive),
      orderBy: BRANCH_ORDER_BY,
    })
  }

  /** Paginated version for the admin Branches table. */
  async findAllPaginated(
    includeInactive = false,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResult<Prisma.BranchGetPayload<object>>> {
    const where = this.buildFindAllWhere(includeInactive)
    const { skip, take, page: normalizedPage, pageSize: normalizedPageSize } = normalizePagination(
      page,
      pageSize
    )

    const [data, total] = await this.prisma.$transaction([
      this.prisma.branch.findMany({ where, orderBy: BRANCH_ORDER_BY, skip, take }),
      this.prisma.branch.count({ where }),
    ])

    return buildPaginatedResult(data, total, normalizedPage, normalizedPageSize)
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } })
    if (!branch) {
      throw new NotFoundException(`Branch ${id} not found`)
    }
    return branch
  }

  async create(dto: CreateBranchDto) {
    await this.assertNameAvailable(dto.name)
    if (dto.isHeadquarters) {
      await this.clearExistingHeadquarters()
    }
    return this.prisma.branch.create({ data: dto })
  }

  async update(id: string, dto: UpdateBranchDto) {
    const current = await this.findOne(id)

    if (dto.name && dto.name !== current.name) {
      await this.assertNameAvailable(dto.name, id)
    }

    if (dto.isHeadquarters) {
      await this.clearExistingHeadquarters(id)
    } else if (dto.isHeadquarters === false && current.isHeadquarters) {
      throw new BadRequestException(
        "At least one branch must be marked as headquarters — set another branch as headquarters instead of unsetting this one."
      )
    }

    return this.prisma.branch.update({ where: { id }, data: dto })
  }

  /** Soft-delete, matching Department/Position/Unit. The headquarters
   *  branch can't be deactivated — reassign headquarters to another branch
   *  first. */
  async remove(id: string) {
    const current = await this.findOne(id)
    if (current.isHeadquarters) {
      throw new BadRequestException(
        "The headquarters branch can't be deactivated. Mark another branch as headquarters first."
      )
    }
    return this.prisma.branch.update({ where: { id }, data: { isActive: false } })
  }

  private async assertNameAvailable(name: string, excludeId?: string) {
    const existing = await this.prisma.branch.findFirst({
      where: { name, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    })
    if (existing) {
      throw new ConflictException(`A branch named "${name}" already exists`)
    }
  }

  private async clearExistingHeadquarters(excludeId?: string) {
    await this.prisma.branch.updateMany({
      where: { isHeadquarters: true, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      data: { isHeadquarters: false },
    })
  }
}
