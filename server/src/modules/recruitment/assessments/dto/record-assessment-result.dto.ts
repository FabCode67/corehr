import { ApiPropertyOptional } from "@nestjs/swagger"
import { AssessmentResult } from "@prisma/client"
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator"

export class RecordAssessmentResultDto {
  @IsString()
  actingEmployeeId!: string

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  score?: number

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxScore?: number

  @IsEnum(AssessmentResult)
  result!: AssessmentResult

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comments?: string
}
