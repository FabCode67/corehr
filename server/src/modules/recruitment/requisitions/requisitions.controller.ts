import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { RecruitmentStageName } from "@prisma/client"

import { ActingEmployeeDto } from "./dto/acting-employee.dto"
import { CreateRequisitionDto } from "./dto/create-requisition.dto"
import { RejectRequisitionDto } from "./dto/reject-requisition.dto"
import { UpdateRequisitionDto } from "./dto/update-requisition.dto"
import { UpdateStageDto } from "./dto/update-stage.dto"
import { RequisitionsService, type RequisitionFilters } from "./requisitions.service"

@ApiTags("Recruitment / Job Requisitions")
@Controller("recruitment/requisitions")
export class RequisitionsController {
  constructor(private readonly requisitionsService: RequisitionsService) {}

  @Get()
  findAll(
    @Query("actingEmployeeId") actingEmployeeId: string,
    @Query("departmentId") departmentId?: string,
    @Query("branchId") branchId?: string,
    @Query("status") status?: string,
    @Query("recruiterId") recruiterId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    const filters: RequisitionFilters = { departmentId, branchId, status, recruiterId }
    if (page) {
      return this.requisitionsService.findAllPaginated(
        filters,
        actingEmployeeId,
        Number(page),
        pageSize ? Number(pageSize) : undefined
      )
    }
    return this.requisitionsService.findAll(filters, actingEmployeeId)
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.requisitionsService.findOne(id, actingEmployeeId)
  }

  @Post()
  create(@Body() dto: CreateRequisitionDto, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.requisitionsService.create(dto, actingEmployeeId)
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRequisitionDto,
    @Query("actingEmployeeId") actingEmployeeId: string
  ) {
    return this.requisitionsService.update(id, dto, actingEmployeeId)
  }

  @Post(":id/submit")
  submit(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ActingEmployeeDto) {
    return this.requisitionsService.submit(id, dto)
  }

  @Post(":id/approve")
  approve(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ActingEmployeeDto) {
    return this.requisitionsService.approve(id, dto)
  }

  @Post(":id/reject")
  reject(@Param("id", ParseUUIDPipe) id: string, @Body() dto: RejectRequisitionDto) {
    return this.requisitionsService.reject(id, dto)
  }

  @Post(":id/close")
  close(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ActingEmployeeDto) {
    return this.requisitionsService.close(id, dto)
  }

  @Get(":id/stages")
  getStages(@Param("id", ParseUUIDPipe) id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.requisitionsService.getStages(id, actingEmployeeId)
  }

  @Patch(":id/stages/:stage")
  updateStage(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("stage") stage: RecruitmentStageName,
    @Body() dto: UpdateStageDto
  ) {
    return this.requisitionsService.updateStage(id, stage, dto)
  }
}
