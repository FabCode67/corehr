import { Module } from "@nestjs/common"

import { PerformanceAccessService } from "./performance-access.service"

@Module({
  providers: [PerformanceAccessService],
  exports: [PerformanceAccessService],
})
export class PerformanceAccessModule {}
