import { Module } from "@nestjs/common"

import { LearningAccessService } from "./learning-access.service"

@Module({
  providers: [LearningAccessService],
  exports: [LearningAccessService],
})
export class LearningAccessModule {}
