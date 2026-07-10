import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator"

export class CreateFunctionDto {
  @MaxLength(120)
  @IsString()
  name!: string

  @ApiPropertyOptional()
  @MaxLength(20)
  @IsString()
  @IsOptional()
  code?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
