import { ApiPropertyOptional } from "@nestjs/swagger"
import { PartialType } from "@nestjs/swagger"
import { IsBoolean, IsOptional } from "class-validator"

import { CreateDocumentTypeDto } from "./create-document-type.dto"

export class UpdateDocumentTypeDto extends PartialType(CreateDocumentTypeDto) {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
