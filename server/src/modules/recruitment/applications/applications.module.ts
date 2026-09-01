import { Module } from "@nestjs/common"

import { RecruitmentAccessModule } from "../access/recruitment-access.module"
import { RecruitmentWorkflowsModule } from "../workflows/recruitment-workflows.module"
import { EmailModule } from "../../email/email.module"

import { ApplicationsController } from "./applications.controller"
import { ApplicationsService } from "./applications.service"

@Module({
  imports: [RecruitmentAccessModule, EmailModule, RecruitmentWorkflowsModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
