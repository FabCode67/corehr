import { Module } from "@nestjs/common"

import { TrainingCategoriesController } from "./training-categories.controller"
import { TrainingCategoriesService } from "./training-categories.service"

@Module({
  controllers: [TrainingCategoriesController],
  providers: [TrainingCategoriesService],
  exports: [TrainingCategoriesService],
})
export class TrainingCategoriesModule {}
