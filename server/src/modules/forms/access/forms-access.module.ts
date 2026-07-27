import { Module } from "@nestjs/common"

import { FormsAccessService } from "./forms-access.service"

@Module({
  providers: [FormsAccessService],
  exports: [FormsAccessService],
})
export class FormsAccessModule {}
