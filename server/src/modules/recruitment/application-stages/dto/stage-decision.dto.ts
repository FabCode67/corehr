import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsOptional, IsString } from "class-validator"

/** Shared body for advance/return/hold/reject/withdraw — every candidate
 *  progression action the spec asks for ("every stage change must be
 *  recorded in the recruitment history with the date, user, comments, and
 *  decision"), so all five share the same shape. */
export class StageDecisionDto {
  @IsString()
  actingEmployeeId!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comments?: string
}
