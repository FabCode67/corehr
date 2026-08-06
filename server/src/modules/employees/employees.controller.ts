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
  StreamableFile,
} from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { AssignPositionDto } from "./dto/assign-position.dto"
import { ChangeBandDto } from "./dto/change-band.dto"
import { CreateEmployeeDto } from "./dto/create-employee.dto"
import { CreateEducationDto, UpdateEducationDto } from "./dto/education.dto"
import { ProcessExitDto } from "./dto/process-exit.dto"
import { SetAdminAccessDto } from "./dto/set-admin-access.dto"
import { TransferEmployeeDto } from "./dto/transfer-employee.dto"
import { CreateChildDto, UpdateChildDto, UpdatePartnerDto } from "./dto/update-family.dto"
import { UpdateEmployeeDto } from "./dto/update-employee.dto"
import { UpdateEmploymentDetailsDto } from "./dto/update-employment-details.dto"
import { EMPLOYEE_EXPORT_COLUMNS, EmployeesExportService } from "./employees-export.service"
import { EmployeesService } from "./employees.service"

@ApiTags("Employees")
@Controller("employees")
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly exportService: EmployeesExportService
  ) {}

  @Get()
  findAll(
    @Query("departmentId") departmentId?: string,
    @Query("unitId") unitId?: string,
    @Query("positionId") positionId?: string,
    @Query("branchId") branchId?: string,
    @Query("includeInactive") includeInactive?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    const filters = {
      departmentId,
      unitId,
      positionId,
      branchId,
      includeInactive: includeInactive === "true",
    }
    // `page` is opt-in: omit it and you get the full array exactly as
    // before (dropdowns/cascading selects rely on this); pass it and you
    // get the paginated envelope the admin table view uses.
    if (page) {
      return this.employeesService.findAllPaginated(
        filters,
        Number(page),
        pageSize ? Number(pageSize) : undefined
      )
    }
    return this.employeesService.findAll(filters)
  }

  @Get("by-number/:employeeNumber")
  findByEmployeeNumber(@Param("employeeNumber") employeeNumber: string) {
    return this.employeesService.findByEmployeeNumber(employeeNumber)
  }

  /** Batch line-manager lookup for the employee list table — same
   *  resolution rules as getReportingManager() below, but computed for
   *  every active employee in a couple of queries instead of N+1 calls to
   *  that per-employee endpoint. */
  @Get("line-managers")
  getLineManagersBatch() {
    return this.employeesService.getLineManagersBatch()
  }

  // ---- Column-picker export (must stay above the `:id` route below, same
  // reasoning as line-managers — otherwise Nest matches "export" as an id) --

  /** The full catalog of columns the client renders as checkboxes — single
   *  source of truth lives in employees-export.service.ts. */
  @Get("export/columns")
  getExportColumns() {
    return EMPLOYEE_EXPORT_COLUMNS
  }

  @Get("export")
  async exportEmployees(
    @Query("columns") columns?: string,
    @Query("format") format?: string,
    @Query("departmentId") departmentId?: string,
    @Query("unitId") unitId?: string,
    @Query("positionId") positionId?: string,
    @Query("branchId") branchId?: string,
    @Query("includeInactive") includeInactive?: string
  ) {
    const requestedKeys = (columns ?? "").split(",").map((k) => k.trim()).filter(Boolean)
    const resolvedColumns = this.exportService.resolveColumns(requestedKeys)

    const [employees, lineManagers] = await Promise.all([
      this.employeesService.findAllForExport({
        departmentId,
        unitId,
        positionId,
        branchId,
        includeInactive: includeInactive === "true",
      }),
      this.employeesService.getLineManagersBatch(),
    ])

    const isCsv = format === "csv"
    const buffer = isCsv
      ? this.exportService.generateCsv(employees, lineManagers, resolvedColumns)
      : this.exportService.generateXlsx(employees, lineManagers, resolvedColumns)
    const extension = isCsv ? "csv" : "xlsx"

    return new StreamableFile(buffer, {
      type: isCsv ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: `attachment; filename="employees-${Date.now()}.${extension}"`,
    })
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.employeesService.findOne(id)
  }

  @Get(":id/reporting-manager")
  getReportingManager(@Param("id") id: string) {
    return this.employeesService.getReportingManager(id)
  }

  @Get(":id/history")
  getHistory(@Param("id") id: string) {
    return this.employeesService.getHistory(id)
  }

  // ---- Step 1: Basic Information -----------------------------------------

  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto)
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto)
  }

  // ---- Step 2: Employment Details -----------------------------------------

  @Patch(":id/employment-details")
  updateEmploymentDetails(
    @Param("id") id: string,
    @Body() dto: UpdateEmploymentDetailsDto
  ) {
    return this.employeesService.updateEmploymentDetails(id, dto)
  }

  // ---- Step 3: Position Assignment ----------------------------------------

  @Post(":id/position-assignment")
  assignPosition(@Param("id") id: string, @Body() dto: AssignPositionDto) {
    return this.employeesService.assignPosition(id, dto)
  }

  @Post(":id/transfer")
  transfer(@Param("id") id: string, @Body() dto: TransferEmployeeDto) {
    return this.employeesService.transferPosition(id, dto)
  }

  @Post(":id/band")
  changeBand(@Param("id") id: string, @Body() dto: ChangeBandDto) {
    return this.employeesService.changeBand(id, dto)
  }

  // ---- Admin Access (Settings > Admin Access) -----------------------------

  @Patch(":id/admin-access")
  setAdminAccess(@Param("id") id: string, @Body() dto: SetAdminAccessDto) {
    return this.employeesService.setAdminAccess(id, dto.isAdmin)
  }

  // ---- Step 4: Family Information -----------------------------------------

  @Put(":id/partner")
  updatePartner(@Param("id") id: string, @Body() dto: UpdatePartnerDto) {
    return this.employeesService.updatePartner(id, dto)
  }

  @Post(":id/children")
  addChild(@Param("id") id: string, @Body() dto: CreateChildDto) {
    return this.employeesService.addChild(id, dto)
  }

  @Patch(":id/children/:childId")
  updateChild(
    @Param("id") id: string,
    @Param("childId", ParseUUIDPipe) childId: string,
    @Body() dto: UpdateChildDto
  ) {
    return this.employeesService.updateChild(id, childId, dto)
  }

  @Delete(":id/children/:childId")
  removeChild(
    @Param("id") id: string,
    @Param("childId", ParseUUIDPipe) childId: string
  ) {
    return this.employeesService.removeChild(id, childId)
  }

  /** Visual Family Tree — see EmployeesService.getFamilyTree()'s doc
   *  comment for why this is the first read path for EmployeeFamilyMember. */
  @Get(":id/family-tree")
  getFamilyTree(@Param("id") id: string) {
    return this.employeesService.getFamilyTree(id)
  }

  // ---- Step 5: Education & Professional Development ------------------------

  @Post(":id/education")
  addEducation(@Param("id") id: string, @Body() dto: CreateEducationDto) {
    return this.employeesService.addEducation(id, dto)
  }

  @Patch(":id/education/:educationId")
  updateEducation(
    @Param("id") id: string,
    @Param("educationId", ParseUUIDPipe) educationId: string,
    @Body() dto: UpdateEducationDto
  ) {
    return this.employeesService.updateEducation(id, educationId, dto)
  }

  @Delete(":id/education/:educationId")
  removeEducation(
    @Param("id") id: string,
    @Param("educationId", ParseUUIDPipe) educationId: string
  ) {
    return this.employeesService.removeEducation(id, educationId)
  }

  // ---- Exit Management ------------------------------------------------------

  @Post(":id/exit")
  processExit(@Param("id") id: string, @Body() dto: ProcessExitDto) {
    return this.employeesService.processExit(id, dto)
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.employeesService.deactivate(id)
  }
}
