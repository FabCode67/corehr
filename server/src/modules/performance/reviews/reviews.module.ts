import { Module } from "@nestjs/common"

import { EmployeesModule } from "../../employees/employees.module"
import { PerformanceAccessModule } from "../access/performance-access.module"
import { ReviewPeriodsModule } from "../review-periods/review-periods.module"

import { ReviewsController } from "./reviews.controller"
import { ReviewsService } from "./reviews.service"

@Module({
  imports: [PerformanceAccessModule, ReviewPeriodsModule, EmployeesModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
