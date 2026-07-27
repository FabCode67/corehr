import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { ActingEmployeeDto } from "./dto/acting-employee.dto"
import { CreateWorkforcePlanDto } from "./dto/create-workforce-plan.dto"
import { RejectWorkforcePlanDto } from "./dto/reject-workforce-plan.dto"
import { UpdateWorkforcePlanDto } from "./dto/update-workforce-plan.dto"
import { WorkforcePlansService, type WorkforcePlanFilters } from "./workforce-plans.service"

@ApiTags("Recruitment / Workforce Plans")
@Controller("recruitment/workforce-plans")
export class WorkforcePlansController {
  constructor(private readonly workforcePlansService: WorkforcePlansService) {}

  @Get()
  findAll(
    @Query("actingEmployeeId") actingEmployeeId: string,
    @Query("departmentId") departmentId?: string,
    @Query("branchId") branchId?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    const filters: WorkforcePlanFilters = { departmentId, branchId, status }
    if (page) {
      return this.workforcePlansService.findAllPaginated(filters, actingEmployeeId, Number(page), pageSize ? Number(pageSize) : undefined)
    }
    return this.workforcePlansService.findAll(filters, actingEmployeeId)
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.workforcePlansService.findOne(id, actingEmployeeId)
  }

  @Post()
  create(@Body() dto: CreateWorkforcePlanDto, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.workforcePlansService.create(dto, actingEmployeeId)
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkforcePlanDto,
    @Query("actingEmployeeId") actingEmployeeId: string
  ) {
    return this.workforcePlansService.update(id, dto, actingEmployeeId)
  }

  @Post(":id/submit")
  submit(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ActingEmployeeDto) {
    return this.workforcePlansService.submit(id, dto)
  }

  @Post(":id/approve")
  approve(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ActingEmployeeDto) {
    return this.workforcePlansService.approve(id, dto)
  }

  @Post(":id/reject")
  reject(@Param("id", ParseUUIDPipe) id: string, @Body() dto: RejectWorkforcePlanDto) {
    return this.workforcePlansService.reject(id, dto)
  }
}
