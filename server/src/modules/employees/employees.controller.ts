import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { ChangeBandDto } from "./dto/change-band.dto"
import { CreateEmployeeDto } from "./dto/create-employee.dto"
import { TransferEmployeeDto } from "./dto/transfer-employee.dto"
import { UpdateEmployeeDto } from "./dto/update-employee.dto"
import { EmployeesService } from "./employees.service"

@ApiTags("Employees")
@Controller("employees")
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll(
    @Query("departmentId") departmentId?: string,
    @Query("unitId") unitId?: string,
    @Query("positionId") positionId?: string
  ) {
    return this.employeesService.findAll({ departmentId, unitId, positionId })
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.employeesService.findOne(id)
  }

  @Get(":id/reporting-manager")
  getReportingManager(@Param("id", ParseUUIDPipe) id: string) {
    return this.employeesService.getReportingManager(id)
  }

  @Get(":id/history")
  getHistory(@Param("id", ParseUUIDPipe) id: string) {
    return this.employeesService.getHistory(id)
  }

  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto)
  }

  @Post(":id/transfer")
  transfer(@Param("id", ParseUUIDPipe) id: string, @Body() dto: TransferEmployeeDto) {
    return this.employeesService.transferPosition(id, dto)
  }

  @Post(":id/band")
  changeBand(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ChangeBandDto) {
    return this.employeesService.changeBand(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.employeesService.deactivate(id)
  }
}
