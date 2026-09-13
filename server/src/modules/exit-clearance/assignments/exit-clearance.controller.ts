import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CompleteClearanceFormDto } from "./dto/complete-clearance-form.dto"
import { ReviewClearanceFormDto } from "./dto/review-clearance-form.dto"
import { ExitClearanceService } from "./exit-clearance.service"

@ApiTags("Exit Clearance / Assignments")
@Controller("exit-clearance/assignments")
export class ExitClearanceController {
  constructor(private readonly exitClearanceService: ExitClearanceService) {}

  @Get("employee/:employeeId")
  findForEmployee(@Param("employeeId") employeeId: string) {
    return this.exitClearanceService.findForEmployee(employeeId)
  }

  @Get("employee/:employeeId/progress")
  getProgress(@Param("employeeId") employeeId: string) {
    return this.exitClearanceService.getProgressForEmployee(employeeId)
  }

  @Get("reviewer/:employeeId/queue")
  getReviewerQueue(@Param("employeeId") employeeId: string) {
    return this.exitClearanceService.getReviewerQueue(employeeId)
  }

  @Get("hr-dashboard")
  getHrDashboard() {
    return this.exitClearanceService.getHrDashboard()
  }

  @Post(":id/complete")
  employeeComplete(@Param("id", ParseUUIDPipe) id: string, @Body() dto: CompleteClearanceFormDto) {
    return this.exitClearanceService.employeeComplete(id, dto.employeeId)
  }

  @Post(":id/review")
  review(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ReviewClearanceFormDto) {
    return this.exitClearanceService.review(id, dto)
  }
}
