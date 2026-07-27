import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsBoolean, IsOptional, IsString } from "class-validator"

export class UpdateOnboardingTaskDto {
  @IsString()
  actingEmployeeId!: string

  @IsBoolean()
  isCompleted!: boolean

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string
}
