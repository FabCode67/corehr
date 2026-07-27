import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator"

export class CreateCandidateDto {
  @MaxLength(100)
  @IsString()
  firstName!: string

  @MaxLength(100)
  @IsString()
  lastName!: string

  @IsEmail()
  email!: string

  @IsString()
  phone!: string

  @IsString()
  nationality!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cvUrl?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  coverLetterUrl?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  education?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  experience?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  certifications?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  skills?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  references?: string
}
