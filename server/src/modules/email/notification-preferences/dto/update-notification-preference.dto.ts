import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsBoolean, IsOptional } from "class-validator"

export class UpdateNotificationPreferenceDto {
  @ApiPropertyOptional({ description: "Master email switch. Mandatory/compliance templates still send regardless of this — see EmailService.enqueue()." })
  @IsBoolean()
  @IsOptional()
  emailEnabled?: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  inAppEnabled?: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  leaveEmails?: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  performanceEmails?: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  learningEmails?: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  recruitmentEmails?: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  exitEmails?: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  approvalEmails?: boolean
}
