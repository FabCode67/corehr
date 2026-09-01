import { Module } from "@nestjs/common"

import { ExitDocumentTypesController } from "./document-types.controller"
import { ExitDocumentTypesService } from "./document-types.service"

@Module({
  controllers: [ExitDocumentTypesController],
  providers: [ExitDocumentTypesService],
  exports: [ExitDocumentTypesService],
})
export class ExitDocumentTypesModule {}
