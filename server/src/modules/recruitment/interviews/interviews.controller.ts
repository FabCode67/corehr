import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateInterviewDto } from "./dto/create-interview.dto"
import { RecordInterviewOutcomeDto } from "./dto/record-interview-outcome.dto"
import { SetPanelistsDto } from "./dto/set-panelists.dto"
import { UpdateInterviewDto } from "./dto/update-interview.dto"
import { InterviewsService } from "./interviews.service"

@ApiTags("Recruitment / Interviews")
@Controller("recruitment/interviews")
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get()
  findAll(@Query("actingEmployeeId") actingEmployeeId: string, @Query("applicationId") applicationId?: string) {
    return this.interviewsService.findAll(applicationId, actingEmployeeId)
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.interviewsService.findOne(id, actingEmployeeId)
  }

  @Post()
  create(@Body() dto: CreateInterviewDto, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.interviewsService.create(dto, actingEmployeeId)
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateInterviewDto,
    @Query("actingEmployeeId") actingEmployeeId: string
  ) {
    return this.interviewsService.update(id, dto, actingEmployeeId)
  }

  @Patch(":id/panelists")
  setPanelists(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SetPanelistsDto,
    @Query("actingEmployeeId") actingEmployeeId: string
  ) {
    return this.interviewsService.setPanelists(id, dto, actingEmployeeId)
  }

  @Post(":id/outcome")
  recordOutcome(@Param("id", ParseUUIDPipe) id: string, @Body() dto: RecordInterviewOutcomeDto) {
    return this.interviewsService.recordOutcome(id, dto)
  }
}
