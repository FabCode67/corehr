import { ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsArray, IsDate, IsOptional, IsString } from "class-validator"

export class UpdateInvestigationDto {
  @IsString()
  actingEmployeeId!: string

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  dueDate?: Date

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  summary?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  findings?: string

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportingDocumentUrls?: string[]

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  recommendation?: string
}
