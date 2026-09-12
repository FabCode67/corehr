import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../../common/pagination"
import { PrismaService } from "../../../prisma/prisma.service"

import { CreateDepartmentDto } from "./dto/create-department.dto"
import { UpdateDepartmentDto } from "./dto/update-department.dto"

const DEPARTMENT_LIST_INCLUDE = {
  function: true,
  units: { where: { isActive: true } },
  parentDepartment: { select: { id: true, name: true } },
  headOfDepartment: { select: { employeeNumber: true, firstName: true, middleName: true, lastName: true } },
} as const

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildFindAllWhere(params: {
    functionId?: string
    includeInactive?: boolean
    search?: string
  }): Prisma.DepartmentWhereInput {
    const { functionId, includeInactive = false, search } = params

    return {
      ...(includeInactive ? {} : { isActive: true }),
      ...(functionId ? { functionId } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    }
  }

  /** Full, unpaginated list — used by filter dropdowns throughout the app
   *  (Leave approvals/calendar/analytics filters, etc.). See
   *  findAllPaginated() for the admin table view. */
  findAll(params: { functionId?: string; includeInactive?: boolean; search?: string } = {}) {
    return this.prisma.department.findMany({
      where: this.buildFindAllWhere(params),
      include: DEPARTMENT_LIST_INCLUDE,
      orderBy: { name: "asc" },
    })
  }

  /** Paginated version for the Departments admin table. */
  async findAllPaginated(
    params: { functionId?: string; includeInactive?: boolean; search?: string } = {},
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResult<Prisma.DepartmentGetPayload<{ include: typeof DEPARTMENT_LIST_INCLUDE }>>> {
    const where = this.buildFindAllWhere(params)
    const { skip, take, page: normalizedPage, pageSize: normalizedPageSize } = normalizePagination(
      page,
      pageSize
    )

    const [data, total] = await this.prisma.$transaction([
      this.prisma.department.findMany({
        where,
        include: DEPARTMENT_LIST_INCLUDE,
        orderBy: { name: "asc" },
        skip,
        take,
      }),
      this.prisma.department.count({ where }),
    ])

    return buildPaginatedResult(data, total, normalizedPage, normalizedPageSize)
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        function: true,
        units: { where: { isActive: true } },
        positions: { where: { isActive: true, unitId: null } },
        parentDepartment: { select: { id: true, name: true } },
        headOfDepartment: { select: { employeeNumber: true, firstName: true, middleName: true, lastName: true } },
      },
    })

    if (!department) {
      throw new NotFoundException(`Department ${id} not found`)
    }

    return department
  }

  async create(dto: CreateDepartmentDto) {
    await this.assertFunctionExists(dto.functionId)
    await this.assertNameAvailable(dto.functionId, dto.name)
    await this.assertParentDepartmentValid(dto.parentDepartmentId)
    await this.assertHeadOfDepartmentValid(dto.headOfDepartmentId)

    return this.prisma.department.create({ data: dto })
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const current = await this.findOne(id)
    const functionId = dto.functionId ?? current.functionId

    if (dto.functionId) {
      await this.assertFunctionExists(dto.functionId)
    }

    if (dto.name) {
      await this.assertNameAvailable(functionId, dto.name, id)
    }

    if (dto.parentDepartmentId !== undefined) {
      await this.assertParentDepartmentValid(dto.parentDepartmentId, id)
    }

    if (dto.headOfDepartmentId !== undefined) {
      await this.assertHeadOfDepartmentValid(dto.headOfDepartmentId)
    }

    return this.prisma.department.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)

    return this.prisma.department.update({
      where: { id },
      data: { isActive: false },
    })
  }

  private async assertFunctionExists(functionId: string) {
    const fn = await this.prisma.function.findUnique({ where: { id: functionId } })

    if (!fn) {
      throw new NotFoundException(`Function ${functionId} not found`)
    }
  }

  /** Validates a chosen Parent Department: must exist, can't be the
   *  department itself, and can't create a cycle (i.e. the department being
   *  saved can't already be an ancestor of the parent it's being assigned).
   *  `currentId` is omitted on create — a brand-new department can't yet be
   *  anyone's ancestor, so only the "does it exist" check applies. */
  private async assertParentDepartmentValid(parentDepartmentId: string | undefined, currentId?: string) {
    if (!parentDepartmentId) return

    if (parentDepartmentId === currentId) {
      throw new BadRequestException("A department cannot be its own parent department.")
    }

    const parent = await this.prisma.department.findUnique({ where: { id: parentDepartmentId } })
    if (!parent) {
      throw new NotFoundException(`Parent department ${parentDepartmentId} not found`)
    }

    if (currentId) {
      const seen = new Set<string>([parentDepartmentId])
      let cursor = parent.parentDepartmentId
      while (cursor) {
        if (cursor === currentId) {
          throw new BadRequestException("That would create a circular department hierarchy.")
        }
        if (seen.has(cursor)) break // defensive: don't loop forever over pre-existing bad data
        seen.add(cursor)
        const ancestor = await this.prisma.department.findUnique({ where: { id: cursor }, select: { parentDepartmentId: true } })
        cursor = ancestor?.parentDepartmentId ?? null
      }
    }
  }

  /** Head of Department (Bulk Import framework's "Head of Department"
   *  column — see Department.headOfDepartmentId's schema doc comment) was
   *  never settable from this admin form before; this is the first UI path
   *  besides bulk import that writes it, so it needs the same existence
   *  check the other optional relation pickers on this form get. Doesn't
   *  require the employee to already work in this department — HR may be
   *  designating someone ahead of a transfer, or simply hasn't moved them
   *  yet. */
  private async assertHeadOfDepartmentValid(headOfDepartmentId: string | undefined) {
    if (!headOfDepartmentId) return

    const employee = await this.prisma.employee.findUnique({ where: { employeeNumber: headOfDepartmentId } })
    if (!employee) {
      throw new NotFoundException(`Employee ${headOfDepartmentId} not found`)
    }
  }

  private async assertNameAvailable(functionId: string, name: string, excludeId?: string) {
    const existing = await this.prisma.department.findFirst({
      where: {
        functionId,
        name,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    })

    if (existing) {
      throw new ConflictException(
        `A department named "${name}" already exists under this function`
      )
    }
  }
}
