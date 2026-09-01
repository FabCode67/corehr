import { Module } from "@nestjs/common"

import { RecruitmentAccessModule } from "../access/recruitment-access.module"

import { RecruitmentWorkflowsController } from "./recruitment-workflows.controller"
import { RecruitmentWorkflowsService } from "./recruitment-workflows.service"

@Module({
  imports: [RecruitmentAccessModule],
  controllers: [RecruitmentWorkflowsController],
  providers: [RecruitmentWorkflowsService],
  exports: [RecruitmentWorkflowsService],
})
export class RecruitmentWorkflowsModule {}
