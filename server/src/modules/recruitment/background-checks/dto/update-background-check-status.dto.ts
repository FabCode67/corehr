import { ApiPropertyOptional } from "@nestjs/swagger"
import { BackgroundCheckStatus } from "@prisma/client"
import { IsEnum, IsOptional, IsString } from "class-validator"

export class UpdateBackgroundCheckStatusDto {
  @IsString()
  actingEmployeeId!: string

  @IsEnum(BackgroundCheckStatus)
  status!: BackgroundCheckStatus

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comments?: string
}
