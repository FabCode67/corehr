import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import {
  CreateLeaveTypeDto,
  ReplaceApprovalStepsDto,
  UpdateLeaveTypeDto,
  UpsertCarryForwardRuleDto,
  UpsertEntitlementRuleDto,
} from "./dto/leave-type.dto"
import { LeaveTypesService } from "./leave-types.service"

@ApiTags("Leave / Types")
@Controller("leave/types")
export class LeaveTypesController {
  constructor(private readonly leaveTypesService: LeaveTypesService) {}

  @Get()
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.leaveTypesService.findAll(includeInactive === "true")
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.leaveTypesService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateLeaveTypeDto) {
    return this.leaveTypesService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateLeaveTypeDto) {
    return this.leaveTypesService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.leaveTypesService.remove(id)
  }

  @Put(":id/entitlement-rules")
  upsertEntitlementRule(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpsertEntitlementRuleDto
  ) {
    return this.leaveTypesService.upsertEntitlementRule(id, dto)
  }

  @Delete(":id/entitlement-rules/:employeeCategory")
  removeEntitlementRule(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("employeeCategory") employeeCategory: string
  ) {
    return this.leaveTypesService.removeEntitlementRule(id, employeeCategory)
  }

  @Put(":id/approval-steps")
  replaceApprovalSteps(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ReplaceApprovalStepsDto) {
    return this.leaveTypesService.replaceApprovalSteps(id, dto)
  }

  @Put(":id/carry-forward-rule")
  upsertCarryForwardRule(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpsertCarryForwardRuleDto
  ) {
    return this.leaveTypesService.upsertCarryForwardRule(id, dto)
  }
}
