import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { ApplicationStagesService } from "./application-stages.service"
import { StageDecisionDto } from "./dto/stage-decision.dto"
import { SubmitStageScoreDto } from "./dto/submit-stage-score.dto"

@ApiTags("Recruitment / Candidate Pipeline")
@Controller("recruitment/applications/:applicationId/pipeline")
export class ApplicationStagesController {
  constructor(private readonly service: ApplicationStagesService) {}

  @Get()
  getPipeline(@Param("applicationId", ParseUUIDPipe) applicationId: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.service.getPipeline(applicationId, actingEmployeeId)
  }

  @Post("advance")
  advance(@Param("applicationId", ParseUUIDPipe) applicationId: string, @Body() dto: StageDecisionDto) {
    return this.service.advance(applicationId, dto)
  }

  @Post("return")
  returnToPrevious(@Param("applicationId", ParseUUIDPipe) applicationId: string, @Body() dto: StageDecisionDto) {
    return this.service.returnToPrevious(applicationId, dto)
  }

  @Post("hold")
  hold(@Param("applicationId", ParseUUIDPipe) applicationId: string, @Body() dto: StageDecisionDto) {
    return this.service.hold(applicationId, dto)
  }

  @Post("reject")
  reject(@Param("applicationId", ParseUUIDPipe) applicationId: string, @Body() dto: StageDecisionDto) {
    return this.service.reject(applicationId, dto)
  }

  @Post("withdraw")
  withdraw(@Param("applicationId", ParseUUIDPipe) applicationId: string, @Body() dto: StageDecisionDto) {
    return this.service.withdraw(applicationId, dto)
  }

}

/** Separate controller (same module) since ranking is scoped by job
 *  posting, not by a single application — see the "Candidate Ranking"
 *  spec section. */
@ApiTags("Recruitment / Candidate Pipeline")
@Controller("recruitment/job-postings/:jobPostingId/ranking")
export class ApplicationRankingController {
  constructor(private readonly service: ApplicationStagesService) {}

  @Get()
  rank(@Param("jobPostingId", ParseUUIDPipe) jobPostingId: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.service.rankForPosting(jobPostingId, actingEmployeeId)
  }
}

/** Also separate: scoring is keyed by stage instance alone, not nested
 *  under a specific application in the URL — same reasoning as
 *  ApplicationRankingController above. */
@ApiTags("Recruitment / Candidate Pipeline")
@Controller("recruitment/application-stage-instances")
export class ApplicationStageInstancesController {
  constructor(private readonly service: ApplicationStagesService) {}

  @Post(":id/score")
  submitScore(@Param("id", ParseUUIDPipe) id: string, @Body() dto: SubmitStageScoreDto) {
    return this.service.submitScore(id, dto)
  }
}
