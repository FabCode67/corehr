import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from "class-validator"

export class CreateInstitutionDto {
  @MaxLength(150)
  @IsString()
  name!: string

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  contactEmail?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contactPhone?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  website?: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
