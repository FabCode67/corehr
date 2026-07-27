import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateJobDescriptionDto } from "./dto/create-job-description.dto"
import { UpdateJobDescriptionDto } from "./dto/update-job-description.dto"
import { JobDescriptionsService } from "./job-descriptions.service"

@ApiTags("Recruitment / Job Descriptions")
@Controller("recruitment/job-descriptions")
export class JobDescriptionsController {
  constructor(private readonly jobDescriptionsService: JobDescriptionsService) {}

  @Get()
  findAll(
    @Query("includeInactive") includeInactive?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    if (page) {
      return this.jobDescriptionsService.findAllPaginated(
        includeInactive === "true",
        Number(page),
        pageSize ? Number(pageSize) : undefined
      )
    }
    return this.jobDescriptionsService.findAll(includeInactive === "true")
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.jobDescriptionsService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateJobDescriptionDto) {
    return this.jobDescriptionsService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateJobDescriptionDto) {
    return this.jobDescriptionsService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.jobDescriptionsService.remove(id)
  }
}
