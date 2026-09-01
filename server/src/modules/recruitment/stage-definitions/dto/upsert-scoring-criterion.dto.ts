import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator"

export class UpsertScoringCriterionDto {
  @MaxLength(120)
  @IsString()
  name!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional()
  @Min(1)
  @Max(100)
  @IsInt()
  @IsOptional()
  maxScore?: number

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sortOrder?: number

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @IsString()
  actingEmployeeId!: string
}
