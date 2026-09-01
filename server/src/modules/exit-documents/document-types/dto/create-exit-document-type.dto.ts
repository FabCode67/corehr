import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from "class-validator"

export class CreateExitDocumentTypeDto {
  @MaxLength(150)
  @IsString()
  name!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sortOrder?: number
}
