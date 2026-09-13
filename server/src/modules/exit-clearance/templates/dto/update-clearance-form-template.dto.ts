import { ApiPropertyOptional, PartialType } from "@nestjs/swagger"
import { IsBoolean, IsOptional } from "class-validator"

import { CreateClearanceFormTemplateDto } from "./create-clearance-form-template.dto"

export class UpdateClearanceFormTemplateDto extends PartialType(CreateClearanceFormTemplateDto) {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
