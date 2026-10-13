import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, StreamableFile } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { SaveJobDescriptionDto } from "./dto/save-job-description.dto"
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

  @Get("latest-for-position/:positionId")
  latestForPosition(@Param("positionId", ParseUUIDPipe) positionId: string) {
    return this.jobDescriptionsService.latestForPosition(positionId)
  }

  @Post("structured")
  createStructured(@Body() dto: SaveJobDescriptionDto) {
    return this.jobDescriptionsService.createStructured(dto)
  }

  @Get(":id/structured")
  getStructured(@Param("id", ParseUUIDPipe) id: string) {
    return this.jobDescriptionsService.getStructured(id)
  }

  @Patch(":id/structured")
  updateStructured(@Param("id", ParseUUIDPipe) id: string, @Body() dto: SaveJobDescriptionDto) {
    return this.jobDescriptionsService.updateStructured(id, dto)
  }

  @Get(":id/docx")
  async docx(@Param("id", ParseUUIDPipe) id: string) {
    const { buffer, fileName } = await this.jobDescriptionsService.renderDocx(id)
    return new StreamableFile(buffer, {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      disposition: `attachment; filename="${fileName.replace(/[^\w .-]/g, "")}"`,
    })
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
