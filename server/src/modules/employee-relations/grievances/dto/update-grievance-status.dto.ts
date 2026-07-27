import { ApiPropertyOptional } from "@nestjs/swagger"
import { GrievanceStatus } from "@prisma/client"
import { IsEnum, IsOptional, IsString } from "class-validator"

export class UpdateGrievanceStatusDto {
  @IsString()
  actingEmployeeId!: string

  @IsEnum(GrievanceStatus)
  status!: GrievanceStatus

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  resolutionComments?: string
}
