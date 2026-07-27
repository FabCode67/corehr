import { Module } from "@nestjs/common"

import { RecruitmentAccessModule } from "../access/recruitment-access.module"

import { InterviewsController } from "./interviews.controller"
import { InterviewsService } from "./interviews.service"

@Module({
  imports: [RecruitmentAccessModule],
  controllers: [InterviewsController],
  providers: [InterviewsService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
