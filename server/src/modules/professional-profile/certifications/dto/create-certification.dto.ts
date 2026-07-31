import { ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsDate, IsOptional, IsString, MaxLength } from "class-validator"

export class CreateCertificationDto {
  @IsString()
  employeeId!: string

  @MaxLength(160)
  @IsString()
  name!: string

  @MaxLength(160)
  @IsString()
  issuer!: string

  @ApiPropertyOptional()
  @MaxLength(80)
  @IsString()
  @IsOptional()
  certificateNumber?: string

  @Type(() => Date)
  @IsDate()
  issueDate!: Date

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  expiryDate?: Date

  @ApiPropertyOptional({ description: "Cloudinary URL, set via POST /uploads first." })
  @IsString()
  @IsOptional()
  certificateUrl?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  certificateFileName?: string

  @IsString()
  actingEmployeeId!: string
}
