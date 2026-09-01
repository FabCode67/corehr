import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateWorkflowDto, SetWorkflowStagesDto, UpdateWorkflowDto } from "./dto/upsert-workflow.dto"
import { RecruitmentWorkflowsService } from "./recruitment-workflows.service"

@ApiTags("Recruitment / Workflows")
@Controller("recruitment/workflows")
export class RecruitmentWorkflowsController {
  constructor(private readonly service: RecruitmentWorkflowsService) {}

  @Get()
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.service.findAll(includeInactive === "true")
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateWorkflowDto) {
    return this.service.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateWorkflowDto) {
    return this.service.update(id, dto)
  }

  @Delete(":id")
  deactivate(@Param("id", ParseUUIDPipe) id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.service.deactivate(id, actingEmployeeId)
  }

  @Put(":id/stages")
  setStages(@Param("id", ParseUUIDPipe) id: string, @Body() dto: SetWorkflowStagesDto) {
    return this.service.setStages(id, dto)
  }
}
