import { ApiPropertyOptional } from "@nestjs/swagger"
import { StageStatus } from "@prisma/client"
import { Type } from "class-transformer"
import { IsDate, IsEnum, IsOptional, IsString } from "class-validator"

export class UpdateStageDto {
  @IsString()
  actingEmployeeId!: string

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  plannedStart?: Date

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  plannedEnd?: Date

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  actualStart?: Date

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  actualEnd?: Date

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ownerId?: string

  @ApiPropertyOptional()
  @IsEnum(StageStatus)
  @IsOptional()
  status?: StageStatus

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comments?: string
}
