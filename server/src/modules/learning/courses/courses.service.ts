import { Injectable, NotFoundException } from "@nestjs/common"
import { ContractType, CourseDeliveryMethod, Prisma } from "@prisma/client"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../../common/pagination"
import { PrismaService } from "../../../prisma/prisma.service"

import { CreateCourseDto } from "./dto/create-course.dto"
import { UpdateCourseDto } from "./dto/update-course.dto"

export const COURSE_INCLUDE = {
  category: true,
  institution: true,
  requiredFunction: { select: { id: true, name: true } },
  requiredDepartment: { select: { id: true, name: true } },
  requiredUnit: { select: { id: true, name: true } },
  requiredPosition: { select: { id: true, title: true } },
  requiredLevel: { select: { id: true, name: true } },
  requiredBand: { select: { id: true, name: true } },
} as const

/** Minimal shape of an employee (with position -> department -> function
 *  loaded) needed to evaluate Course eligibility — see isEligible(). */
export interface EligibilityEmployee {
  positionId: string | null
  bandId: string | null
  contractType: ContractType | null
  position: {
    departmentId: string
    unitId: string | null
    levelId: string
    department: { functionId: string }
  } | null
}

const ELIGIBILITY_EMPLOYEE_INCLUDE = {
  position: { select: { departmentId: true, unitId: true, levelId: true, department: { select: { functionId: true } } } },
} as const

/** Minimal shape of a Course needed to evaluate eligibility. */
export interface EligibilityCourse {
  requiredFunctionId: string | null
  requiredDepartmentId: string | null
  requiredUnitId: string | null
  requiredPositionId: string | null
  requiredLevelId: string | null
  requiredBandId: string | null
  requiredContractType: ContractType | null
}

export interface CourseFilters {
  categoryId?: string
  institutionId?: string
  deliveryMethod?: string
  includeInactive?: boolean
}

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  private buildFindAllWhere(filters: CourseFilters): Prisma.CourseWhereInput {
    return {
      ...(filters.includeInactive ? {} : { isActive: true }),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.institutionId ? { institutionId: filters.institutionId } : {}),
      ...(filters.deliveryMethod ? { deliveryMethod: filters.deliveryMethod as CourseDeliveryMethod } : {}),
    }
  }

  findAll(filters: CourseFilters = {}) {
    return this.prisma.course.findMany({
      where: this.buildFindAllWhere(filters),
      include: COURSE_INCLUDE,
      orderBy: [{ name: "asc" }],
    })
  }

  async findAllPaginated(
    filters: CourseFilters = {},
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResult<Prisma.CourseGetPayload<{ include: typeof COURSE_INCLUDE }>>> {
    const where = this.buildFindAllWhere(filters)
    const { skip, take, page: normalizedPage, pageSize: normalizedPageSize } = normalizePagination(page, pageSize)

    const [data, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({ where, include: COURSE_INCLUDE, orderBy: [{ name: "asc" }], skip, take }),
      this.prisma.course.count({ where }),
    ])

    return buildPaginatedResult(data, total, normalizedPage, normalizedPageSize)
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id }, include: COURSE_INCLUDE })
    if (!course) {
      throw new NotFoundException(`Course ${id} not found`)
    }
    return course
  }

  async create(dto: CreateCourseDto) {
    await this.assertCategoryExists(dto.categoryId)
    if (dto.institutionId) await this.assertInstitutionExists(dto.institutionId)

    return this.prisma.$transaction(async (tx) => {
      const courseCode = await this.generateCourseCode(tx)
      return tx.course.create({ data: { ...dto, courseCode }, include: COURSE_INCLUDE })
    })
  }

  async update(id: string, dto: UpdateCourseDto) {
    await this.findOne(id)
    if (dto.categoryId) await this.assertCategoryExists(dto.categoryId)
    if (dto.institutionId) await this.assertInstitutionExists(dto.institutionId)
    return this.prisma.course.update({ where: { id }, data: dto, include: COURSE_INCLUDE })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.course.update({ where: { id }, data: { isActive: false }, include: COURSE_INCLUDE })
  }

  /** True if `employee` satisfies every eligibility restriction the course
   *  has set — unset restrictions are always satisfied. See the schema's
   *  Learning & Development doc comment. */
  isEligible(employee: EligibilityEmployee, course: EligibilityCourse): boolean {
    if (course.requiredFunctionId && employee.position?.department.functionId !== course.requiredFunctionId) {
      return false
    }
    if (course.requiredDepartmentId && employee.position?.departmentId !== course.requiredDepartmentId) {
      return false
    }
    if (course.requiredUnitId && employee.position?.unitId !== course.requiredUnitId) {
      return false
    }
    if (course.requiredPositionId && employee.positionId !== course.requiredPositionId) {
      return false
    }
    if (course.requiredLevelId && employee.position?.levelId !== course.requiredLevelId) {
      return false
    }
    if (course.requiredBandId && employee.bandId !== course.requiredBandId) {
      return false
    }
    if (course.requiredContractType && employee.contractType !== course.requiredContractType) {
      return false
    }
    return true
  }

  /** All active employees eligible for `courseId` — powers the admin
   *  "bulk-assign to eligible employees" flow. */
  async findEligibleEmployees(courseId: string) {
    const course = await this.findOne(courseId)
    const employees = await this.prisma.employee.findMany({
      where: { isActive: true },
      select: {
        employeeNumber: true,
        firstName: true,
        lastName: true,
        positionId: true,
        bandId: true,
        contractType: true,
        ...ELIGIBILITY_EMPLOYEE_INCLUDE,
      },
    })

    return employees.filter((employee) => this.isEligible(employee, course))
  }

  private async assertCategoryExists(categoryId: string) {
    const category = await this.prisma.trainingCategory.findUnique({ where: { id: categoryId } })
    if (!category) {
      throw new NotFoundException(`Training category ${categoryId} not found`)
    }
  }

  private async assertInstitutionExists(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({ where: { id: institutionId } })
    if (!institution) {
      throw new NotFoundException(`Institution ${institutionId} not found`)
    }
  }

  /**
   * courseCode is generated as CRS-0001, CRS-0002, ... — identical approach
   * to EmployeesService.generateEmployeeNumber (parses the numeric suffix of
   * every existing code and takes the max in JS rather than an ORDER BY, so
   * it stays correct past CRS-9999).
   */
  private async generateCourseCode(tx: Prisma.TransactionClient): Promise<string> {
    const courses = await tx.course.findMany({ select: { courseCode: true } })
    const max = courses.reduce((highest, course) => {
      const match = /^CRS-(\d+)$/.exec(course.courseCode)
      return match ? Math.max(highest, parseInt(match[1], 10)) : highest
    }, 0)
    return `CRS-${String(max + 1).padStart(4, "0")}`
  }
}
