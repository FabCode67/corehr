import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsInt, IsOptional, IsString, Min, MaxLength } from "class-validator"

export class CreateBandDto {
  @MaxLength(40)
  @IsString()
  name!: string

  /** Ordering for comparisons (Band 1 = rank 1, Band 10 = rank 10, ...). */
  @Min(1)
  @IsInt()
  rank!: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string
}
