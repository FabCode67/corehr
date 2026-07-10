import { Module } from "@nestjs/common"

import { FunctionsController } from "./functions.controller"
import { FunctionsService } from "./functions.service"

@Module({
  controllers: [FunctionsController],
  providers: [FunctionsService],
  exports: [FunctionsService],
})
export class FunctionsModule {}
