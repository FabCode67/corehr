import { IsString } from "class-validator"

export class RejectCertificateDto {
  @IsString()
  actingEmployeeId!: string

  @IsString()
  hrVerificationComment!: string
}
