import { ApiPropertyOptional } from "@nestjs/swagger"
import { OnboardingDocumentStatus } from "@prisma/client"
import { IsEnum, IsIn, IsOptional, IsString } from "class-validator"

const REVIEW_STATUSES: OnboardingDocumentStatus[] = ["APPROVED", "REJECTED", "RESUBMISSION_REQUIRED", "UNDER_REVIEW"]

export class ReviewDocumentDto {
  @IsString()
  actingEmployeeId!: string

  @IsEnum(OnboardingDocumentStatus)
  @IsIn(REVIEW_STATUSES)
  status!: OnboardingDocumentStatus

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reviewComments?: string
}
