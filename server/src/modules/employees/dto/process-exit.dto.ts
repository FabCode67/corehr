import { ApiPropertyOptional } from "@nestjs/swagger"
import { ExitReason, ExitType } from "@prisma/client"
import { Type } from "class-transformer"
import { IsDate, IsEnum, IsOptional, IsString } from "class-validator"

/**
 * Exit Management. Processing an exit is a one-way action: it sets
 * employmentStatus to EXIT, closes the employee's open PositionHistory row
 * as of exitDate, and clears positionId (the position becomes vacant —
 * Position is a reusable role/template, not a numbered seat, so vacancy is
 * simply "no employee currently holds it"). The employee row itself is
 * never deleted, per the spec.
 */
export class ProcessExitDto {
  @Type(() => Date)
  @IsDate()
  exitDate!: Date

  @IsEnum(ExitReason)
  exitReason!: ExitReason

  @IsEnum(ExitType)
  exitType!: ExitType

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nextMove?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comments?: string
}
