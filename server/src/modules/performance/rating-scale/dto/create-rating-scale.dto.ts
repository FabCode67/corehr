import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator"

export class CreateRatingScaleDto {
  /** 1 (Unsatisfactory) .. 5 (Outstanding). */
  @Min(1)
  @Max(5)
  @IsInt()
  rank!: number

  @MaxLength(60)
  @IsString()
  label!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional({ description: "The organization's expected percentage of ratings at this rank, for the bell-curve 'expected vs actual' overlay." })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  expectedPercentage?: number
}
