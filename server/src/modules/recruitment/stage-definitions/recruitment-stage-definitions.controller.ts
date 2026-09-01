import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateStageDefinitionDto, UpdateStageDefinitionDto } from "./dto/upsert-stage-definition.dto"
import { UpsertScoringCriterionDto } from "./dto/upsert-scoring-criterion.dto"
import { RecruitmentStageDefinitionsService } from "./recruitment-stage-definitions.service"

@ApiTags("Recruitment / Stage Catalog")
@Controller("recruitment/stage-definitions")
export class RecruitmentStageDefinitionsController {
  constructor(private readonly service: RecruitmentStageDefinitionsService) {}

  @Get()
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.service.findAll(includeInactive === "true")
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateStageDefinitionDto) {
    return this.service.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateStageDefinitionDto) {
    return this.service.update(id, dto)
  }

  @Delete(":id")
  deactivate(@Param("id", ParseUUIDPipe) id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.service.deactivate(id, actingEmployeeId)
  }

  @Post(":id/criteria")
  upsertCriterion(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpsertScoringCriterionDto) {
    return this.service.upsertCriterion(id, dto)
  }

  @Delete("criteria/:criterionId")
  removeCriterion(@Param("criterionId", ParseUUIDPipe) criterionId: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.service.removeCriterion(criterionId, actingEmployeeId)
  }
}
