import { ApiPropertyOptional } from "@nestjs/swagger"
import { AssessmentType } from "@prisma/client"
import { Type } from "class-transformer"
import { IsDate, IsEnum, IsOptional, IsString, IsUUID } from "class-validator"

export class CreateAssessmentDto {
  @IsUUID()
  applicationId!: string

  @IsEnum(AssessmentType)
  assessmentType!: AssessmentType

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  scheduledDate?: Date

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  evaluatorId?: string
}
