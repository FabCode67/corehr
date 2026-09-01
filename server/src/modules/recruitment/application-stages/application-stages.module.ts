import { Module } from "@nestjs/common"

import { RecruitmentAccessModule } from "../access/recruitment-access.module"
import { EmailModule } from "../../email/email.module"

import { ApplicationRankingController, ApplicationStageInstancesController, ApplicationStagesController } from "./application-stages.controller"
import { ApplicationStagesService } from "./application-stages.service"

@Module({
  imports: [RecruitmentAccessModule, EmailModule],
  controllers: [ApplicationStagesController, ApplicationRankingController, ApplicationStageInstancesController],
  providers: [ApplicationStagesService],
  exports: [ApplicationStagesService],
})
export class ApplicationStagesModule {}
