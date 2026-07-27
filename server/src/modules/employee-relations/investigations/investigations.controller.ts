import { Body, Controller, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CompleteInvestigationDto } from "./dto/complete-investigation.dto"
import { CreateInvestigationDto } from "./dto/create-investigation.dto"
import { UpdateInvestigationDto } from "./dto/update-investigation.dto"
import { InvestigationsService } from "./investigations.service"

@ApiTags("Employee Relations / Investigations")
@Controller("employee-relations/cases/:caseId/investigations")
export class InvestigationsController {
  constructor(private readonly investigationsService: InvestigationsService) {}

  @Post()
  create(@Param("caseId", ParseUUIDPipe) caseId: string, @Body() dto: CreateInvestigationDto) {
    return this.investigationsService.create(caseId, dto)
  }

  @Patch(":investigationId")
  update(
    @Param("caseId", ParseUUIDPipe) caseId: string,
    @Param("investigationId", ParseUUIDPipe) investigationId: string,
    @Body() dto: UpdateInvestigationDto
  ) {
    return this.investigationsService.update(caseId, investigationId, dto)
  }

  @Post(":investigationId/complete")
  complete(
    @Param("caseId", ParseUUIDPipe) caseId: string,
    @Param("investigationId", ParseUUIDPipe) investigationId: string,
    @Body() dto: CompleteInvestigationDto
  ) {
    return this.investigationsService.complete(caseId, investigationId, dto)
  }
}
