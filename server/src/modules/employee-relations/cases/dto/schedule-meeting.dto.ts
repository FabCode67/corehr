import { ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsDate, IsOptional, IsString } from "class-validator"

export class ScheduleMeetingDto {
  @Type(() => Date)
  @IsDate()
  scheduledAt!: Date

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string

  @IsString()
  createdById!: string
}
