import { ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsDate, IsEnum, IsOptional, IsString, IsUUID } from "class-validator"

export enum TransferChangeTypeDto {
  PROMOTION = "PROMOTION",
  DEMOTION = "DEMOTION",
  TRANSFER = "TRANSFER",
  REPORTING_LINE_CHANGE = "REPORTING_LINE_CHANGE",
  RESTRUCTURE = "RESTRUCTURE",
}

export class TransferEmployeeDto {
  @IsUUID()
  positionId!: string

  @IsEnum(TransferChangeTypeDto)
  changeType!: TransferChangeTypeDto

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  changeReason?: string

  @Type(() => Date)
  @IsDate()
  effectiveFrom!: Date
}
