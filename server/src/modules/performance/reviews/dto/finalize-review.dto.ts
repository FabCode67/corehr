import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsOptional, IsString } from "class-validator"

export class FinalizeReviewDto {
  @IsString()
  actingEmployeeId!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  hrComments?: string
}
