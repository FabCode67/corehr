import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateInstitutionDto } from "./dto/create-institution.dto"
import { ReviewInstitutionDto } from "./dto/review-institution.dto"
import { InstitutionsService } from "./institutions.service"

@ApiTags("Professional Profile / Institutions")
@Controller("institutions")
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @Get("pending-review")
  listPendingReview() {
    return this.institutionsService.listPendingReview()
  }

  @Get()
  search(@Query("q") q: string, @Query("includeUnverified") includeUnverified?: string) {
    return this.institutionsService.search(q, includeUnverified === "true")
  }

  @Post()
  create(@Body() dto: CreateInstitutionDto) {
    return this.institutionsService.create(dto)
  }

  @Patch(":id/review")
  review(@Param("id") id: string, @Body() dto: ReviewInstitutionDto) {
    return this.institutionsService.review(id, dto)
  }
}
