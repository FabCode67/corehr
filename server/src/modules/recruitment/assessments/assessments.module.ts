import { Module } from "@nestjs/common"

import { RecruitmentAccessModule } from "../access/recruitment-access.module"
import { EmailModule } from "../../email/email.module"

import { AssessmentsController } from "./assessments.controller"
import { AssessmentsService } from "./assessments.service"

@Module({
  imports: [RecruitmentAccessModule, EmailModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
