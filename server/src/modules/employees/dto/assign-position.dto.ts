import { ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsDate, IsOptional, IsUUID } from "class-validator"

/**
 * Step 3 of the Employee Registration wizard — Position Assignment. Used
 * both for the employee's very first assignment (no current position yet)
 * and to revise the answer while still filling in the wizard: see
 * EmployeesService.assignPosition for why this edits the currently-open
 * PositionHistory row in place rather than always opening a new one — once
 * the employee is fully onboarded, subsequent changes should go through
 * POST /employees/:id/transfer or /band instead, which do open new rows.
 */
export class AssignPositionDto {
  @IsUUID()
  positionId!: string

  @IsUUID()
  bandId!: string

  @Type(() => Date)
  @IsDate()
  effectiveFrom!: Date

  @ApiPropertyOptional({
    description:
      "Only for documented exceptions. Leave unset to derive the reporting manager automatically from the position hierarchy.",
  })
  @IsUUID()
  @IsOptional()
  reportingManagerOverrideId?: string
}
