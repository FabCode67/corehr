import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"
import { AssignSkillDto, UpdateSkillLevelDto } from "./dto/assign-skill.dto"
import { CreateSkillDto } from "./dto/create-skill.dto"

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  search(query?: string) {
    return this.prisma.skill.findMany({
      where: query ? { name: { contains: query, mode: "insensitive" } } : undefined,
      orderBy: { name: "asc" },
      take: 50,
    })
  }

  async createCustom(dto: CreateSkillDto) {
    try {
      return await this.prisma.skill.create({
        data: { name: dto.name, category: dto.category ?? "General", addedById: dto.actingEmployeeId },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // Someone else already added this exact skill name — just return it
        // rather than erroring, so "Custom skill addition" never blocks the
        // employee on a race with another employee's identical addition.
        const existing = await this.prisma.skill.findUnique({ where: { name: dto.name } })
        if (existing) return existing
      }
      throw error
    }
  }

  listForEmployee(employeeId: string) {
    return this.prisma.employeeSkill.findMany({
      where: { employeeId },
      include: { skill: true },
      orderBy: { skill: { name: "asc" } },
    })
  }

  async assign(dto: AssignSkillDto) {
    const existing = await this.prisma.employeeSkill.findUnique({
      where: { employeeId_skillId: { employeeId: dto.employeeId, skillId: dto.skillId } },
    })
    if (existing) {
      throw new ConflictException("This skill is already on the employee's profile.")
    }
    return this.prisma.employeeSkill.create({
      data: { employeeId: dto.employeeId, skillId: dto.skillId, level: dto.level ?? "INTERMEDIATE" },
      include: { skill: true },
    })
  }

  async updateLevel(id: string, employeeId: string, dto: UpdateSkillLevelDto) {
    await this.assertOwnership(id, employeeId)
    return this.prisma.employeeSkill.update({ where: { id }, data: { level: dto.level }, include: { skill: true } })
  }

  async remove(id: string, employeeId: string) {
    await this.assertOwnership(id, employeeId)
    await this.prisma.employeeSkill.delete({ where: { id } })
  }

  private async assertOwnership(id: string, employeeId: string) {
    const record = await this.prisma.employeeSkill.findUnique({ where: { id } })
    if (!record || record.employeeId !== employeeId) {
      throw new NotFoundException(`Skill record ${id} not found for this employee`)
    }
    return record
  }
}
