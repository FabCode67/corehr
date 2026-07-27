import { Module } from "@nestjs/common"

import { RatingScaleController } from "./rating-scale.controller"
import { RatingScaleService } from "./rating-scale.service"

@Module({
  controllers: [RatingScaleController],
  providers: [RatingScaleService],
  exports: [RatingScaleService],
})
export class RatingScaleModule {}
