import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator"

export class CreateBranchDto {
  @MaxLength(150)
  @IsString()
  name!: string

  @ApiPropertyOptional()
  @MaxLength(20)
  @IsString()
  @IsOptional()
  code?: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isHeadquarters?: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
