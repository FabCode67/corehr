import { ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsDate, IsOptional, IsString, IsUUID } from "class-validator"

export class ChangeBandDto {
  @IsUUID()
  bandId!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  changeReason?: string

  @Type(() => Date)
  @IsDate()
  effectiveFrom!: Date
}
