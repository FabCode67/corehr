import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateCertificationDto } from "./dto/create-certification.dto"
import { ReviewCertificationDto } from "./dto/review-certification.dto"
import { UpdateCertificationDto } from "./dto/update-certification.dto"
import { CertificationsService } from "./certifications.service"

@ApiTags("Professional Profile / Certifications")
@Controller("profile-certifications")
export class CertificationsController {
  constructor(private readonly certificationsService: CertificationsService) {}

  @Get("pending-review")
  listPendingReview() {
    return this.certificationsService.listPendingReview()
  }

  @Get("employee/:employeeId")
  listForEmployee(@Param("employeeId") employeeId: string) {
    return this.certificationsService.listForEmployee(employeeId)
  }

  @Post()
  create(@Body() dto: CreateCertificationDto) {
    return this.certificationsService.create(dto)
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCertificationDto) {
    return this.certificationsService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Query("employeeId") employeeId: string) {
    return this.certificationsService.remove(id, employeeId)
  }

  @Patch(":id/review")
  review(@Param("id") id: string, @Body() dto: ReviewCertificationDto) {
    return this.certificationsService.review(id, dto)
  }
}
