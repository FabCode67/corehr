import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator"

export class SubmitStageScoreDto {
  @IsUUID()
  criterionId!: string

  @Min(0)
  @IsNumber()
  score!: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comments?: string

  @IsString()
  actingEmployeeId!: string
}
