import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator"

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
}
