import { ApiPropertyOptional } from "@nestjs/swagger"
import { InterviewRecommendation } from "@prisma/client"
import { IsEnum, IsOptional, IsString } from "class-validator"

export class RecordInterviewOutcomeDto {
  @IsString()
  actingEmployeeId!: string

  @IsEnum(InterviewRecommendation)
  recommendation!: InterviewRecommendation

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string
}
