import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { ExitDocumentAssignmentsService } from "./assignments.service"
import { BulkAssignExitDocumentsDto } from "./dto/bulk-assign-exit-documents.dto"
import { CompleteExitDocumentDto } from "./dto/complete-exit-document.dto"

@ApiTags("Exit Documents / Assignments")
@Controller("exit-documents/assignments")
export class ExitDocumentAssignmentsController {
  constructor(private readonly assignmentsService: ExitDocumentAssignmentsService) {}

  @Get("employee/:employeeId")
  findForEmployee(@Param("employeeId") employeeId: string) {
    return this.assignmentsService.findForEmployee(employeeId)
  }

  @Get("employee/:employeeId/progress")
  getProgress(@Param("employeeId") employeeId: string) {
    return this.assignmentsService.getProgress(employeeId)
  }

  @Post("bulk")
  bulkAssign(@Body() dto: BulkAssignExitDocumentsDto) {
    return this.assignmentsService.bulkAssign(dto)
  }

  @Post(":id/complete")
  setCompleted(@Param("id", ParseUUIDPipe) id: string, @Body() dto: CompleteExitDocumentDto) {
    return this.assignmentsService.setCompleted(id, dto)
  }
}
