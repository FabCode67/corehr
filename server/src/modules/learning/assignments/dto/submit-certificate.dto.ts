import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsOptional, IsString } from "class-validator"

export class SubmitCertificateDto {
  @IsString()
  actingEmployeeId!: string

  /** Cloudinary URL, set via POST /uploads first. */
  @IsString()
  certificateUrl!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  employeeCertificateComment?: string
}
