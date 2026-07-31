import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { AssignSkillDto, UpdateSkillLevelDto } from "./dto/assign-skill.dto"
import { CreateSkillDto } from "./dto/create-skill.dto"
import { SkillsService } from "./skills.service"

@ApiTags("Professional Profile / Skills")
@Controller("skills")
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  search(@Query("q") q?: string) {
    return this.skillsService.search(q)
  }

  @Post()
  createCustom(@Body() dto: CreateSkillDto) {
    return this.skillsService.createCustom(dto)
  }

  @Get("employee/:employeeId")
  listForEmployee(@Param("employeeId") employeeId: string) {
    return this.skillsService.listForEmployee(employeeId)
  }

  @Post("employee-skills")
  assign(@Body() dto: AssignSkillDto) {
    return this.skillsService.assign(dto)
  }

  @Patch("employee-skills/:id")
  updateLevel(@Param("id") id: string, @Query("employeeId") employeeId: string, @Body() dto: UpdateSkillLevelDto) {
    return this.skillsService.updateLevel(id, employeeId, dto)
  }

  @Delete("employee-skills/:id")
  remove(@Param("id") id: string, @Query("employeeId") employeeId: string) {
    return this.skillsService.remove(id, employeeId)
  }
}
