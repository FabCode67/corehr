import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { OnboardingTaskType } from "@prisma/client"

import { CompleteOnboardingDto } from "./dto/complete-onboarding.dto"
import { UpdateOnboardingTaskDto } from "./dto/update-onboarding-task.dto"
import { OnboardingService } from "./onboarding.service"

@ApiTags("Recruitment / Onboarding")
@Controller("recruitment/applications/:applicationId/onboarding")
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get("tasks")
  getTasks(@Param("applicationId", ParseUUIDPipe) applicationId: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.onboardingService.getTasks(applicationId, actingEmployeeId)
  }

  @Patch("tasks/:taskType")
  updateTask(
    @Param("applicationId", ParseUUIDPipe) applicationId: string,
    @Param("taskType") taskType: OnboardingTaskType,
    @Body() dto: UpdateOnboardingTaskDto
  ) {
    return this.onboardingService.updateTask(applicationId, taskType, dto)
  }

  @Post("complete")
  complete(@Param("applicationId", ParseUUIDPipe) applicationId: string, @Body() dto: CompleteOnboardingDto) {
    return this.onboardingService.completeOnboarding(applicationId, dto)
  }
}
