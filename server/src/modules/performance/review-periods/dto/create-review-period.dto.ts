import { IsInt, IsString, Max, MaxLength, Min } from "class-validator"

export class CreateReviewPeriodDto {
  /** e.g. "FY2026" */
  @MaxLength(30)
  @IsString()
  name!: string

  @Min(2000)
  @Max(2100)
  @IsInt()
  year!: number
}
