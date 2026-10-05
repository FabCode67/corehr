import { ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsDate, IsIn, IsOptional, IsString, MaxLength } from "class-validator"

import { BNR_CERTIFICATE_CODE_VALUES } from "../../../edwh-report/edwh-codes"

export class CreateCertificationDto {
  @IsString()
  employeeId!: string

  @MaxLength(160)
  @IsString()
  name!: string

  @ApiPropertyOptional({ description: "BNR/EDWH Professional Certificate Code, used in the EDWH report." })
  @IsString()
  @IsIn(BNR_CERTIFICATE_CODE_VALUES)
  @IsOptional()
  bnrCertificateCode?: string

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
