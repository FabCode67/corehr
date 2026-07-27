import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { ActingEmployeeDto } from "./dto/acting-employee.dto"
import { CreateJobPostingDto } from "./dto/create-job-posting.dto"
import { UpdateJobPostingDto } from "./dto/update-job-posting.dto"
import { JobPostingsService, type JobPostingFilters } from "./job-postings.service"

@ApiTags("Recruitment / Job Postings")
@Controller("recruitment/job-postings")
export class JobPostingsController {
  constructor(private readonly jobPostingsService: JobPostingsService) {}

  @Get()
  findAll(
    @Query("actingEmployeeId") actingEmployeeId: string,
    @Query("status") status?: string,
    @Query("requisitionId") requisitionId?: string,
    @Query("branchId") branchId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    const filters: JobPostingFilters = { status, requisitionId, branchId }
    if (page) {
      return this.jobPostingsService.findAllPaginated(
        filters,
        actingEmployeeId,
        Number(page),
        pageSize ? Number(pageSize) : undefined
      )
    }
    return this.jobPostingsService.findAll(filters, actingEmployeeId)
  }

  @Get("open")
  findAllOpen() {
    return this.jobPostingsService.findAllOpen()
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.jobPostingsService.findOne(id, actingEmployeeId)
  }

  @Post()
  create(@Body() dto: CreateJobPostingDto, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.jobPostingsService.create(dto, actingEmployeeId)
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobPostingDto,
    @Query("actingEmployeeId") actingEmployeeId: string
  ) {
    return this.jobPostingsService.update(id, dto, actingEmployeeId)
  }

  @Post(":id/publish")
  publish(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ActingEmployeeDto) {
    return this.jobPostingsService.publish(id, dto)
  }

  @Post(":id/close")
  close(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ActingEmployeeDto) {
    return this.jobPostingsService.close(id, dto)
  }
}
