import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from "class-validator"

export class CreateEmailTemplateDto {
  /** Stable machine key, e.g. "employee_welcome" — used by EmailService.enqueue() call sites. */
  @IsString()
  @MaxLength(100)
  key!: string

  @IsString()
  @MaxLength(150)
  name!: string

  /** e.g. "onboarding" | "leave" | "performance" | "learning" | "recruitment" | "exit" | "approval" — see CATEGORY_TO_PREFERENCE_FIELD in email.service.ts. */
  @IsString()
  @MaxLength(50)
  category!: string

  @IsString()
  subject!: string

  @IsString()
  bodyHtml!: string

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variables?: string[]

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @ApiPropertyOptional({ description: "Mandatory templates (e.g. AML compliance reminders) can never be turned off via Notification Preferences." })
  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean

  @IsString()
  createdById!: string
}
