import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { AppealsService } from "./appeals.service"
import { CreateAppealDto } from "./dto/create-appeal.dto"
import { DecideAppealDto } from "./dto/decide-appeal.dto"

@ApiTags("Employee Relations / Appeals")
@Controller("employee-relations/cases/:caseId/appeals")
export class AppealsController {
  constructor(private readonly appealsService: AppealsService) {}

  @Get()
  findForCase(@Param("caseId", ParseUUIDPipe) caseId: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.appealsService.findForCase(caseId, actingEmployeeId)
  }

  @Get(":appealId")
  findOne(@Param("caseId", ParseUUIDPipe) caseId: string, @Param("appealId", ParseUUIDPipe) appealId: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.appealsService.findOne(caseId, appealId, actingEmployeeId)
  }

  @Post()
  create(@Param("caseId", ParseUUIDPipe) caseId: string, @Body() dto: CreateAppealDto) {
    return this.appealsService.create(caseId, dto)
  }

  @Post(":appealId/decide")
  decide(@Param("caseId", ParseUUIDPipe) caseId: string, @Param("appealId", ParseUUIDPipe) appealId: string, @Body() dto: DecideAppealDto) {
    return this.appealsService.decide(caseId, appealId, dto)
  }
}
