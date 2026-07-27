import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { AssignGrievanceDto } from "./dto/assign-grievance.dto"
import { CreateGrievanceDto } from "./dto/create-grievance.dto"
import { UpdateGrievanceStatusDto } from "./dto/update-grievance-status.dto"
import { GrievancesService, type GrievanceFilters } from "./grievances.service"

@ApiTags("Employee Relations / Grievances")
@Controller("employee-relations/grievances")
export class GrievancesController {
  constructor(private readonly grievancesService: GrievancesService) {}

  @Get()
  findAll(@Query("actingEmployeeId") actingEmployeeId: string, @Query("employeeId") employeeId?: string, @Query("status") status?: string) {
    const filters: GrievanceFilters = { employeeId, status }
    return this.grievancesService.findAll(filters, actingEmployeeId)
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.grievancesService.findOne(id, actingEmployeeId)
  }

  @Post()
  create(@Body() dto: CreateGrievanceDto) {
    return this.grievancesService.create(dto)
  }

  @Patch(":id/status")
  updateStatus(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateGrievanceStatusDto) {
    return this.grievancesService.updateStatus(id, dto)
  }

  @Patch(":id/assign")
  assign(@Param("id", ParseUUIDPipe) id: string, @Body() dto: AssignGrievanceDto) {
    return this.grievancesService.assign(id, dto)
  }
}
