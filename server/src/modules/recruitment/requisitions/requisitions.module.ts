import { Module } from "@nestjs/common"

import { PositionsModule } from "../../organization/positions/positions.module"
import { RecruitmentAccessModule } from "../access/recruitment-access.module"

import { RequisitionsController } from "./requisitions.controller"
import { RequisitionsService } from "./requisitions.service"

@Module({
  imports: [RecruitmentAccessModule, PositionsModule],
  controllers: [RequisitionsController],
  providers: [RequisitionsService],
  exports: [RequisitionsService],
})
export class RequisitionsModule {}
