import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateEducationRecordDto } from "./dto/create-education-record.dto"
import { ReviewEducationRecordDto } from "./dto/review-education-record.dto"
import { UpdateEducationRecordDto } from "./dto/update-education-record.dto"
import { EducationRecordsService } from "./education-records.service"

@ApiTags("Professional Profile / Education")
@Controller("education-records")
export class EducationRecordsController {
  constructor(private readonly educationRecordsService: EducationRecordsService) {}

  @Get("pending-review")
  listPendingReview() {
    return this.educationRecordsService.listPendingReview()
  }

  @Get("employee/:employeeId")
  listForEmployee(@Param("employeeId") employeeId: string) {
    return this.educationRecordsService.listForEmployee(employeeId)
  }

  @Post()
  create(@Body() dto: CreateEducationRecordDto) {
    return this.educationRecordsService.create(dto)
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateEducationRecordDto) {
    return this.educationRecordsService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Query("employeeId") employeeId: string) {
    return this.educationRecordsService.remove(id, employeeId)
  }

  @Patch(":id/review")
  review(@Param("id") id: string, @Body() dto: ReviewEducationRecordDto) {
    return this.educationRecordsService.review(id, dto)
  }
}
