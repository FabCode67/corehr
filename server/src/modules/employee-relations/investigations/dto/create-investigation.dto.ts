import { ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsDate, IsOptional, IsString } from "class-validator"

export class CreateInvestigationDto {
  @IsString()
  actingEmployeeId!: string

  @IsString()
  investigatorId!: string

  @Type(() => Date)
  @IsDate()
  startDate!: Date

  @ApiPropertyOptional({ description: "Expected completion date — drives the overdue dashboard metric." })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  dueDate?: Date
}
