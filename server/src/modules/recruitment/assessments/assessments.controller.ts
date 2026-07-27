import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { AssessmentsService } from "./assessments.service"
import { CreateAssessmentDto } from "./dto/create-assessment.dto"
import { RecordAssessmentResultDto } from "./dto/record-assessment-result.dto"
import { UpdateAssessmentDto } from "./dto/update-assessment.dto"

@ApiTags("Recruitment / Assessments")
@Controller("recruitment/assessments")
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get()
  findAll(@Query("actingEmployeeId") actingEmployeeId: string, @Query("applicationId") applicationId?: string) {
    return this.assessmentsService.findAll(applicationId, actingEmployeeId)
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.assessmentsService.findOne(id, actingEmployeeId)
  }

  @Post()
  create(@Body() dto: CreateAssessmentDto, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.assessmentsService.create(dto, actingEmployeeId)
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssessmentDto,
    @Query("actingEmployeeId") actingEmployeeId: string
  ) {
    return this.assessmentsService.update(id, dto, actingEmployeeId)
  }

  @Post(":id/result")
  recordResult(@Param("id", ParseUUIDPipe) id: string, @Body() dto: RecordAssessmentResultDto) {
    return this.assessmentsService.recordResult(id, dto)
  }
}
