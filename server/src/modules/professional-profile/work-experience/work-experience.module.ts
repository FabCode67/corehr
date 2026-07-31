import { Module } from "@nestjs/common"

import { WorkExperienceController } from "./work-experience.controller"
import { WorkExperienceService } from "./work-experience.service"

@Module({
  controllers: [WorkExperienceController],
  providers: [WorkExperienceService],
  exports: [WorkExperienceService],
})
export class WorkExperienceModule {}
