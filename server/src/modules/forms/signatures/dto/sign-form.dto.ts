import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsOptional, IsString } from "class-validator"

export class SignFormDto {
  @IsString()
  actingEmployeeId!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comments?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ipAddress?: string
}
