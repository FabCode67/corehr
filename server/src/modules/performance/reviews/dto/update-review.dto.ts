import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator"

/**
 * All assessment fields are optional so this same endpoint can serve as the
 * autosave draft handler (the UI PATCHes on every field blur/interval while
 * status is DRAFT) as well as a deliberate one-shot edit.
 */
export class UpdateReviewDto {
  @IsString()
  actingEmployeeId!: string

  @ApiPropertyOptional()
  @Min(1)
  @Max(5)
  @IsInt()
  @IsOptional()
  overallRating?: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  strengths?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  achievements?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  areasForImprovement?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  goalsAchieved?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  goalsNotAchieved?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  behaviourCompetencies?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  recommendedTraining?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  developmentPlan?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  managerComments?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  hrComments?: string
}
