import { Module } from "@nestjs/common"

import { RecruitmentAccessModule } from "../access/recruitment-access.module"

import { JobPostingsController } from "./job-postings.controller"
import { JobPostingsService } from "./job-postings.service"

@Module({
  imports: [RecruitmentAccessModule],
  controllers: [JobPostingsController],
  providers: [JobPostingsService],
  exports: [JobPostingsService],
})
export class JobPostingsModule {}
