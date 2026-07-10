import { Module } from "@nestjs/common"

import { PositionLevelsController } from "./position-levels.controller"
import { PositionLevelsService } from "./position-levels.service"

@Module({
  controllers: [PositionLevelsController],
  providers: [PositionLevelsService],
  exports: [PositionLevelsService],
})
export class PositionLevelsModule {}
