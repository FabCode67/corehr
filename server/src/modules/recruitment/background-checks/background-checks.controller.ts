import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { BackgroundChecksService } from "./background-checks.service"
import { CreateBackgroundCheckDto } from "./dto/create-background-check.dto"
import { UpdateBackgroundCheckStatusDto } from "./dto/update-background-check-status.dto"

@ApiTags("Recruitment / Background Checks")
@Controller("recruitment/background-checks")
export class BackgroundChecksController {
  constructor(private readonly backgroundChecksService: BackgroundChecksService) {}

  @Get()
  findAll(@Query("actingEmployeeId") actingEmployeeId: string, @Query("applicationId") applicationId?: string) {
    return this.backgroundChecksService.findAll(applicationId, actingEmployeeId)
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.backgroundChecksService.findOne(id, actingEmployeeId)
  }

  @Post()
  create(@Body() dto: CreateBackgroundCheckDto, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.backgroundChecksService.create(dto, actingEmployeeId)
  }

  @Patch(":id/status")
  updateStatus(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateBackgroundCheckStatusDto) {
    return this.backgroundChecksService.updateStatus(id, dto)
  }
}
