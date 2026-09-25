import { Module } from "@nestjs/common"

import { AnnualLeavePlanController } from "./annual-leave-plan.controller"
import { AnnualLeavePlanService } from "./annual-leave-plan.service"

@Module({
  controllers: [AnnualLeavePlanController],
  providers: [AnnualLeavePlanService],
  exports: [AnnualLeavePlanService],
})
export class AnnualLeavePlanModule {}
