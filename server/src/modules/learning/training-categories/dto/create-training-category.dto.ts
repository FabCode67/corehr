import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator"

export class CreateTrainingCategoryDto {
  @MaxLength(150)
  @IsString()
  name!: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
