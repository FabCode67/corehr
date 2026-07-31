import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateWorkExperienceDto } from "./dto/create-work-experience.dto"
import { UpdateWorkExperienceDto } from "./dto/update-work-experience.dto"
import { WorkExperienceService } from "./work-experience.service"

@ApiTags("Professional Profile / Work Experience")
@Controller("work-experience")
export class WorkExperienceController {
  constructor(private readonly workExperienceService: WorkExperienceService) {}

  @Get("employee/:employeeId")
  listForEmployee(@Param("employeeId") employeeId: string) {
    return this.workExperienceService.listForEmployee(employeeId)
  }

  @Post()
  create(@Body() dto: CreateWorkExperienceDto) {
    return this.workExperienceService.create(dto)
  }

  @Patch(":id")
  update(@Param("id") id: string, @Query("employeeId") employeeId: string, @Body() dto: UpdateWorkExperienceDto) {
    return this.workExperienceService.update(id, employeeId, dto)
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Query("employeeId") employeeId: string) {
    return this.workExperienceService.remove(id, employeeId)
  }
}
