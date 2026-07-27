import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { ActingEmployeeDto } from "./dto/acting-employee.dto"
import { CloseCaseDto } from "./dto/close-case.dto"
import { CreateDisciplinaryCaseDto } from "./dto/create-disciplinary-case.dto"
import { ScheduleMeetingDto } from "./dto/schedule-meeting.dto"
import { UpdateDisciplinaryCaseDto } from "./dto/update-disciplinary-case.dto"
import { DisciplinaryCasesService, type DisciplinaryCaseFilters } from "./disciplinary-cases.service"

@ApiTags("Employee Relations / Disciplinary Cases")
@Controller("employee-relations/cases")
export class DisciplinaryCasesController {
  constructor(private readonly casesService: DisciplinaryCasesService) {}

  @Get()
  findAll(
    @Query("actingEmployeeId") actingEmployeeId: string,
    @Query("employeeId") employeeId?: string,
    @Query("status") status?: string,
    @Query("category") category?: string
  ) {
    const filters: DisciplinaryCaseFilters = { employeeId, status, category }
    return this.casesService.findAll(filters, actingEmployeeId)
  }

  @Get("history/:employeeId")
  findHistoryForEmployee(@Param("employeeId") employeeId: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.casesService.findHistoryForEmployee(employeeId, actingEmployeeId)
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.casesService.findOne(id, actingEmployeeId)
  }

  @Post()
  create(@Body() dto: CreateDisciplinaryCaseDto) {
    return this.casesService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateDisciplinaryCaseDto, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.casesService.update(id, dto, actingEmployeeId)
  }

  @Post(":id/submit")
  submit(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ActingEmployeeDto) {
    return this.casesService.submit(id, dto.actingEmployeeId)
  }

  @Post(":id/close")
  close(@Param("id", ParseUUIDPipe) id: string, @Body() dto: CloseCaseDto) {
    return this.casesService.close(id, dto)
  }

  @Post(":id/meetings")
  scheduleMeeting(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ScheduleMeetingDto) {
    return this.casesService.scheduleMeeting(id, dto)
  }
}
