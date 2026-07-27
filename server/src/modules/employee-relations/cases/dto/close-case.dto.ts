import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsOptional, IsString } from "class-validator"

export class CloseCaseDto {
  @IsString()
  actingEmployeeId!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comments?: string
}
