import { ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsDate, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator"

export class CreateReviewPeriodDto {
  /** e.g. "FY2026" */
  @MaxLength(30)
  @IsString()
  name!: string

  @Min(2000)
  @Max(2100)
  @IsInt()
  year!: number

  @ApiPropertyOptional({ description: "Target self-appraisal deadline for the Mid-Year cycle — drives the 14/7/1-day and overdue reminder emails." })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  midYearDeadline?: Date

  @ApiPropertyOptional({ description: "Target self-appraisal deadline for the Annual cycle — drives the 14/7/1-day and overdue reminder emails." })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  annualDeadline?: Date
}
