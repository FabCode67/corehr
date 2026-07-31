import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsOptional, IsString, MaxLength } from "class-validator"

export class UpdateProfileSummaryDto {
  @ApiPropertyOptional()
  @MaxLength(2000)
  @IsString()
  @IsOptional()
  professionalSummary?: string

  @ApiPropertyOptional()
  @MaxLength(1000)
  @IsString()
  @IsOptional()
  careerInterests?: string
}
