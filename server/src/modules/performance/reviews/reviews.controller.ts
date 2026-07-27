import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { PerformanceReviewType } from "@prisma/client"

import { AcknowledgeReviewDto } from "./dto/acknowledge-review.dto"
import { CreateReviewDto } from "./dto/create-review.dto"
import { FinalizeReviewDto } from "./dto/finalize-review.dto"
import { ReassignReviewerDto } from "./dto/reassign-reviewer.dto"
import { SubmitReviewDto } from "./dto/submit-review.dto"
import { UpdateReviewDto } from "./dto/update-review.dto"
import { ReviewsService, type ReviewFilters } from "./reviews.service"

@ApiTags("Performance / Reviews")
@Controller("performance/reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  findAll(
    @Query("actingEmployeeId") actingEmployeeId: string,
    @Query("periodId") periodId?: string,
    @Query("reviewType") reviewType?: PerformanceReviewType,
    @Query("status") status?: string,
    @Query("employeeId") employeeId?: string,
    @Query("departmentId") departmentId?: string,
    @Query("unitId") unitId?: string,
    @Query("branchId") branchId?: string,
    @Query("positionId") positionId?: string,
    @Query("levelId") levelId?: string,
    @Query("bandId") bandId?: string,
    @Query("contractType") contractType?: string,
    @Query("gender") gender?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    const filters: ReviewFilters = {
      periodId,
      reviewType,
      status,
      employeeId,
      departmentId,
      unitId,
      branchId,
      positionId,
      levelId,
      bandId,
      contractType,
      gender,
    }

    if (page) {
      return this.reviewsService.findAllPaginated(filters, actingEmployeeId, Number(page), pageSize ? Number(pageSize) : undefined)
    }
    return this.reviewsService.findAll(filters, actingEmployeeId)
  }

  @Get("history/:employeeId")
  history(@Param("employeeId") employeeId: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.reviewsService.historyForEmployee(employeeId, actingEmployeeId)
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.reviewsService.findOne(id, actingEmployeeId)
  }

  @Post()
  create(@Body() dto: CreateReviewDto) {
    return this.reviewsService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateReviewDto) {
    return this.reviewsService.update(id, dto)
  }

  @Post(":id/submit")
  submit(@Param("id", ParseUUIDPipe) id: string, @Body() dto: SubmitReviewDto) {
    return this.reviewsService.submit(id, dto)
  }

  @Post(":id/acknowledge")
  acknowledge(@Param("id", ParseUUIDPipe) id: string, @Body() dto: AcknowledgeReviewDto) {
    return this.reviewsService.acknowledge(id, dto)
  }

  @Post(":id/finalize")
  finalize(@Param("id", ParseUUIDPipe) id: string, @Body() dto: FinalizeReviewDto) {
    return this.reviewsService.finalize(id, dto)
  }

  @Post(":id/reassign-reviewer")
  reassignReviewer(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ReassignReviewerDto) {
    return this.reviewsService.reassignReviewer(id, dto)
  }
}
