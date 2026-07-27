import { Module } from "@nestjs/common"

import { RecruitmentAccessModule } from "../access/recruitment-access.module"

import { BackgroundChecksController } from "./background-checks.controller"
import { BackgroundChecksService } from "./background-checks.service"

@Module({
  imports: [RecruitmentAccessModule],
  controllers: [BackgroundChecksController],
  providers: [BackgroundChecksService],
  exports: [BackgroundChecksService],
})
export class BackgroundChecksModule {}
