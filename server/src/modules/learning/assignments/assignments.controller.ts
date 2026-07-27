import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { ActingEmployeeDto } from "./dto/acting-employee.dto"
import { CreateAssignmentDto } from "./dto/create-assignment.dto"
import { RejectCertificateDto } from "./dto/reject-certificate.dto"
import { SubmitCertificateDto } from "./dto/submit-certificate.dto"
import { UpdateAssignmentDto } from "./dto/update-assignment.dto"
import { VerifyCertificateDto } from "./dto/verify-certificate.dto"
import { AssignmentsService, type AssignmentFilters } from "./assignments.service"

@ApiTags("Learning / Assignments")
@Controller("learning/assignments")
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  findAll(
    @Query("actingEmployeeId") actingEmployeeId: string,
    @Query("employeeId") employeeId?: string,
    @Query("courseId") courseId?: string,
    @Query("categoryId") categoryId?: string,
    @Query("status") status?: string,
    @Query("isMandatory") isMandatory?: string,
    @Query("departmentId") departmentId?: string,
    @Query("branchId") branchId?: string,
    @Query("priority") priority?: string,
    @Query("overdueOnly") overdueOnly?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    const filters: AssignmentFilters = {
      employeeId,
      courseId,
      categoryId,
      status,
      isMandatory: isMandatory === "true" ? true : isMandatory === "false" ? false : undefined,
      departmentId,
      branchId,
      priority,
      overdueOnly: overdueOnly === "true",
    }
    if (page) {
      return this.assignmentsService.findAllPaginated(filters, actingEmployeeId, Number(page), pageSize ? Number(pageSize) : undefined)
    }
    return this.assignmentsService.findAll(filters, actingEmployeeId)
  }

  @Get("learning-plan/:employeeId")
  getLearningPlan(@Param("employeeId") employeeId: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.assignmentsService.getLearningPlan(employeeId, actingEmployeeId)
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.assignmentsService.findOne(id, actingEmployeeId)
  }

  @Post()
  create(@Body() dto: CreateAssignmentDto) {
    return this.assignmentsService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateAssignmentDto) {
    return this.assignmentsService.update(id, dto)
  }

  @Post(":id/accept")
  accept(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ActingEmployeeDto) {
    return this.assignmentsService.accept(id, dto)
  }

  @Post(":id/start")
  start(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ActingEmployeeDto) {
    return this.assignmentsService.start(id, dto)
  }

  @Post(":id/complete")
  markCompleted(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ActingEmployeeDto) {
    return this.assignmentsService.markCompleted(id, dto)
  }

  @Post(":id/submit-certificate")
  submitCertificate(@Param("id", ParseUUIDPipe) id: string, @Body() dto: SubmitCertificateDto) {
    return this.assignmentsService.submitCertificate(id, dto)
  }

  @Post(":id/verify")
  verify(@Param("id", ParseUUIDPipe) id: string, @Body() dto: VerifyCertificateDto) {
    return this.assignmentsService.verify(id, dto)
  }

  @Post(":id/reject")
  reject(@Param("id", ParseUUIDPipe) id: string, @Body() dto: RejectCertificateDto) {
    return this.assignmentsService.reject(id, dto)
  }

  @Post(":id/close")
  close(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ActingEmployeeDto) {
    return this.assignmentsService.close(id, dto)
  }
}
