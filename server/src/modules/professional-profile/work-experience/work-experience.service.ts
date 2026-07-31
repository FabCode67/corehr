import { Injectable, NotFoundException } from "@nestjs/common"

import { PrismaService } from "../../../prisma/prisma.service"
import { CreateWorkExperienceDto } from "./dto/create-work-experience.dto"
import { UpdateWorkExperienceDto } from "./dto/update-work-experience.dto"

@Injectable()
export class WorkExperienceService {
  constructor(private readonly prisma: PrismaService) {}

  listForEmployee(employeeId: string) {
    return this.prisma.employeeWorkExperience.findMany({
      where: { employeeId },
      orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
    })
  }

  async findOne(id: string, employeeId: string) {
    const record = await this.prisma.employeeWorkExperience.findUnique({ where: { id } })
    if (!record || record.employeeId !== employeeId) {
      throw new NotFoundException(`Work experience record ${id} not found for this employee`)
    }
    return record
  }

  create(dto: CreateWorkExperienceDto) {
    const { employeeId, isCurrent, endDate, ...rest } = dto
    return this.prisma.employeeWorkExperience.create({
      data: {
        ...rest,
        employeeId,
        isCurrent: isCurrent ?? false,
        // "Mark current employment" — Present means no end date, full stop.
        endDate: isCurrent ? null : endDate,
      },
    })
  }

  async update(id: string, employeeId: string, dto: UpdateWorkExperienceDto) {
    await this.findOne(id, employeeId)
    const { isCurrent, endDate, ...rest } = dto
    return this.prisma.employeeWorkExperience.update({
      where: { id },
      data: {
        ...rest,
        ...(isCurrent !== undefined ? { isCurrent, endDate: isCurrent ? null : endDate } : { endDate }),
      },
    })
  }

  async remove(id: string, employeeId: string) {
    await this.findOne(id, employeeId)
    await this.prisma.employeeWorkExperience.delete({ where: { id } })
  }
}
