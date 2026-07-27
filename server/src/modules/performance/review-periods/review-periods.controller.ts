import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateReviewPeriodDto } from "./dto/create-review-period.dto"
import { SetCycleStatusDto } from "./dto/set-cycle-status.dto"
import { UpdateReviewPeriodDto } from "./dto/update-review-period.dto"
import { ReviewPeriodsService } from "./review-periods.service"

@ApiTags("Performance / Review Periods")
@Controller("performance/review-periods")
export class ReviewPeriodsController {
  constructor(private readonly reviewPeriodsService: ReviewPeriodsService) {}

  @Get()
  findAll() {
    return this.reviewPeriodsService.findAll()
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.reviewPeriodsService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateReviewPeriodDto) {
    return this.reviewPeriodsService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateReviewPeriodDto) {
    return this.reviewPeriodsService.update(id, dto)
  }

  @Post(":id/open")
  openCycle(@Param("id", ParseUUIDPipe) id: string, @Body() dto: SetCycleStatusDto) {
    return this.reviewPeriodsService.openCycle(id, dto.cycle)
  }

  @Post(":id/close")
  closeCycle(@Param("id", ParseUUIDPipe) id: string, @Body() dto: SetCycleStatusDto) {
    return this.reviewPeriodsService.closeCycle(id, dto.cycle)
  }
}
