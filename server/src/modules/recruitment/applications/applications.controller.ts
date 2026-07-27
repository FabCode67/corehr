import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { ApplicationsService, type ApplicationFilters } from "./applications.service"
import { CreateApplicationDto } from "./dto/create-application.dto"
import { CreateScreeningDto } from "./dto/create-screening.dto"
import { UpdateApplicationStatusDto } from "./dto/update-application-status.dto"

@ApiTags("Recruitment / Applications")
@Controller("recruitment/applications")
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  findAll(
    @Query("actingEmployeeId") actingEmployeeId: string,
    @Query("jobPostingId") jobPostingId?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    const filters: ApplicationFilters = { jobPostingId, status }
    if (page) {
      return this.applicationsService.findAllPaginated(
        filters,
        actingEmployeeId,
        Number(page),
        pageSize ? Number(pageSize) : undefined
      )
    }
    return this.applicationsService.findAll(filters, actingEmployeeId)
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.applicationsService.findOne(id, actingEmployeeId)
  }

  @Post()
  create(@Body() dto: CreateApplicationDto, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.applicationsService.create(dto, actingEmployeeId)
  }

  @Patch(":id/status")
  updateStatus(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateApplicationStatusDto) {
    return this.applicationsService.updateStatus(id, dto)
  }

  @Post(":id/screen")
  screen(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateScreeningDto,
    @Query("actingEmployeeId") actingEmployeeId: string
  ) {
    return this.applicationsService.screen(id, dto, actingEmployeeId)
  }
}
