import { Module } from "@nestjs/common"

import { RecruitmentAccessModule } from "../access/recruitment-access.module"

import { WorkforcePlansController } from "./workforce-plans.controller"
import { WorkforcePlansService } from "./workforce-plans.service"

@Module({
  imports: [RecruitmentAccessModule],
  controllers: [WorkforcePlansController],
  providers: [WorkforcePlansService],
  exports: [WorkforcePlansService],
})
export class WorkforcePlansModule {}
