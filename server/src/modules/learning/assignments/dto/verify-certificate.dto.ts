import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsOptional, IsString } from "class-validator"

export class VerifyCertificateDto {
  @IsString()
  actingEmployeeId!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  hrVerificationComment?: string
}
