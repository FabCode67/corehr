import { Module } from "@nestjs/common"

import { RecruitmentAccessModule } from "../access/recruitment-access.module"

import { ApplicationsController } from "./applications.controller"
import { ApplicationsService } from "./applications.service"

@Module({
  imports: [RecruitmentAccessModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
