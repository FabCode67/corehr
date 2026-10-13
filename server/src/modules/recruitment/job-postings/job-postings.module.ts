import { Module } from "@nestjs/common"

import { RecruitmentAccessModule } from "../access/recruitment-access.module"
import { RecruitmentWorkflowsModule } from "../workflows/recruitment-workflows.module"

import { JobPostingsController } from "./job-postings.controller"
import { JobPostingsService } from "./job-postings.service"

@Module({
  imports: [RecruitmentAccessModule, RecruitmentWorkflowsModule],
  controllers: [JobPostingsController],
  providers: [JobPostingsService],
  exports: [JobPostingsService],
})
export class JobPostingsModule {}
