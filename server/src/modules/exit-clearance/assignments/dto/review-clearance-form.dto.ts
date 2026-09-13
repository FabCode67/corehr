import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsEnum, IsString, ValidateIf } from "class-validator"

export enum ClearanceReviewDecision {
  APPROVE = "APPROVE",
  RETURN = "RETURN",
}

export class ReviewClearanceFormDto {
  @IsString()
  reviewerId!: string

  @IsEnum(ClearanceReviewDecision)
  decision!: ClearanceReviewDecision

  @ApiPropertyOptional({ description: "Required when decision is RETURN — explains what the employee needs to fix. Ignored for APPROVE." })
  @ValidateIf((dto: ReviewClearanceFormDto) => dto.decision === ClearanceReviewDecision.RETURN)
  @IsString()
  comment?: string
}
