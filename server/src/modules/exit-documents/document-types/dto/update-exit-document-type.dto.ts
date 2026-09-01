import { ApiPropertyOptional, PartialType } from "@nestjs/swagger"
import { IsBoolean, IsOptional } from "class-validator"

import { CreateExitDocumentTypeDto } from "./create-exit-document-type.dto"

export class UpdateExitDocumentTypeDto extends PartialType(CreateExitDocumentTypeDto) {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
