import { Module } from "@nestjs/common"

import { ReviewPeriodsController } from "./review-periods.controller"
import { ReviewPeriodsService } from "./review-periods.service"

@Module({
  controllers: [ReviewPeriodsController],
  providers: [ReviewPeriodsService],
  exports: [ReviewPeriodsService],
})
export class ReviewPeriodsModule {}
