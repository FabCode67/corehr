import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { AssignmentsService } from "./assignments.service"
import { BulkAssignDocumentsDto } from "./dto/bulk-assign.dto"
import { ReviewDocumentDto } from "./dto/review-document.dto"
import { UploadDocumentDto } from "./dto/upload-document.dto"

@ApiTags("Onboarding Documents / Assignments")
@Controller("onboarding-documents/assignments")
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get("overview")
  getHrOverview(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.assignmentsService.getHrOverview(actingEmployeeId)
  }

  @Get("employee/:employeeId")
  findForEmployee(@Param("employeeId") employeeId: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.assignmentsService.findForEmployee(employeeId, actingEmployeeId)
  }

  @Get("employee/:employeeId/progress")
  getProgress(@Param("employeeId") employeeId: string) {
    return this.assignmentsService.getProgress(employeeId)
  }

  @Post("bulk")
  bulkAssign(@Body() dto: BulkAssignDocumentsDto) {
    return this.assignmentsService.bulkAssign(dto)
  }

  @Post(":id/upload")
  upload(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UploadDocumentDto) {
    return this.assignmentsService.upload(id, dto)
  }

  @Post(":id/review")
  review(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ReviewDocumentDto) {
    return this.assignmentsService.review(id, dto)
  }
}
