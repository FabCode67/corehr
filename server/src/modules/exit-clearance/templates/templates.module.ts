import { Module } from "@nestjs/common"

import { ClearanceFormTemplatesController } from "./templates.controller"
import { ClearanceFormTemplatesService } from "./templates.service"

@Module({
  controllers: [ClearanceFormTemplatesController],
  providers: [ClearanceFormTemplatesService],
  exports: [ClearanceFormTemplatesService],
})
export class ClearanceFormTemplatesModule {}
