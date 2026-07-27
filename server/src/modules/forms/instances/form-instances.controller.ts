import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { ActingEmployeeDto } from "./dto/acting-employee.dto"
import { AssignFormDto } from "./dto/assign-form.dto"
import { ChooseSignatoryDto } from "./dto/choose-signatory.dto"
import { SaveResponsesDto } from "./dto/save-responses.dto"
import { FormInstancesService, type FormInstanceFilters } from "./form-instances.service"

@ApiTags("Forms / Instances")
@Controller("forms/instances")
export class FormInstancesController {
  constructor(private readonly formInstancesService: FormInstancesService) {}

  @Get()
  findAll(@Query("actingEmployeeId") actingEmployeeId: string, @Query("employeeId") employeeId?: string, @Query("status") status?: string) {
    const filters: FormInstanceFilters = { employeeId, status }
    return this.formInstancesService.findAll(filters, actingEmployeeId)
  }

  @Get("pending-signatures")
  findPendingSignatures(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.formInstancesService.findPendingSignatures(actingEmployeeId)
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.formInstancesService.findOne(id, actingEmployeeId)
  }

  @Get(":id/audit-log")
  getAuditLog(@Param("id", ParseUUIDPipe) id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.formInstancesService.getAuditLog(id, actingEmployeeId)
  }

  @Post()
  assign(@Body() dto: AssignFormDto) {
    return this.formInstancesService.assign(dto)
  }

  @Patch(":id/responses")
  saveDraftResponses(@Param("id", ParseUUIDPipe) id: string, @Body() dto: SaveResponsesDto) {
    return this.formInstancesService.saveDraftResponses(id, dto)
  }

  @Patch(":id/signatures/:signatureId/signatory")
  chooseSignatory(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("signatureId", ParseUUIDPipe) signatureId: string,
    @Body() dto: ChooseSignatoryDto
  ) {
    return this.formInstancesService.chooseSignatory(id, signatureId, dto)
  }

  @Post(":id/submit")
  submit(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ActingEmployeeDto) {
    return this.formInstancesService.submit(id, dto.actingEmployeeId)
  }

  @Post(":id/archive")
  archive(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ActingEmployeeDto) {
    return this.formInstancesService.archive(id, dto.actingEmployeeId)
  }
}
