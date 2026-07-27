import { Module } from "@nestjs/common"

import { FormCategoriesController } from "./form-categories.controller"
import { FormCategoriesService } from "./form-categories.service"

@Module({
  controllers: [FormCategoriesController],
  providers: [FormCategoriesService],
  exports: [FormCategoriesService],
})
export class FormCategoriesModule {}
