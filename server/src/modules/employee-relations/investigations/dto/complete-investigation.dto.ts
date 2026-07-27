import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsOptional, IsString } from "class-validator"

export class CompleteInvestigationDto {
  @IsString()
  actingEmployeeId!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  summary?: string

  @IsString()
  findings!: string

  @IsString()
  recommendation!: string
}
