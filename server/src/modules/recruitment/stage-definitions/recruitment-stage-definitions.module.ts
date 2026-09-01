import { Module } from "@nestjs/common"

import { RecruitmentAccessModule } from "../access/recruitment-access.module"

import { RecruitmentStageDefinitionsController } from "./recruitment-stage-definitions.controller"
import { RecruitmentStageDefinitionsService } from "./recruitment-stage-definitions.service"

@Module({
  imports: [RecruitmentAccessModule],
  controllers: [RecruitmentStageDefinitionsController],
  providers: [RecruitmentStageDefinitionsService],
  exports: [RecruitmentStageDefinitionsService],
})
export class RecruitmentStageDefinitionsModule {}
