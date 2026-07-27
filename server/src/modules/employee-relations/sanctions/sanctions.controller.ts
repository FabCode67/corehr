import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateSanctionDto } from "./dto/create-sanction.dto"
import { SanctionsService } from "./sanctions.service"

@ApiTags("Employee Relations / Sanctions")
@Controller()
export class SanctionsController {
  constructor(private readonly sanctionsService: SanctionsService) {}

  @Post("employee-relations/cases/:caseId/sanctions")
  create(@Param("caseId", ParseUUIDPipe) caseId: string, @Body() dto: CreateSanctionDto) {
    return this.sanctionsService.create(caseId, dto)
  }

  @Get("employee-relations/cases/:caseId/sanctions")
  findForCase(@Param("caseId", ParseUUIDPipe) caseId: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.sanctionsService.findForCase(caseId, actingEmployeeId)
  }

  @Get("employee-relations/employees/:employeeId/sanctions")
  findForEmployee(@Param("employeeId") employeeId: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.sanctionsService.findForEmployee(employeeId, actingEmployeeId)
  }
}
