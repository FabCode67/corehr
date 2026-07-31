import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import type { Prisma } from "@prisma/client"

import { PrismaService } from "../../prisma/prisma.service"

/** "Save dashboard views" — named filter-set presets per user. */
@Injectable()
export class HrAnalyticsSavedViewsService {
  constructor(private readonly prisma: PrismaService) {}

  list(employeeId: string) {
    return this.prisma.hrAnalyticsSavedView.findMany({ where: { employeeId }, orderBy: { name: "asc" } })
  }

  async save(employeeId: string, name: string, filters: Record<string, unknown>) {
    if (!name.trim()) throw new BadRequestException("View name is required.")

    return this.prisma.hrAnalyticsSavedView.upsert({
      where: { employeeId_name: { employeeId, name: name.trim() } },
      create: { employeeId, name: name.trim(), filters: filters as Prisma.InputJsonValue },
      update: { filters: filters as Prisma.InputJsonValue },
    })
  }

  async remove(id: string, employeeId: string) {
    const view = await this.prisma.hrAnalyticsSavedView.findUnique({ where: { id } })
    if (!view || view.employeeId !== employeeId) throw new NotFoundException(`Saved view ${id} not found`)
    await this.prisma.hrAnalyticsSavedView.delete({ where: { id } })
  }
}
