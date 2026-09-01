import { ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsDate, IsOptional, IsString } from "class-validator"

/**
 * Rehire. The one-way reverse of processExit() — see Employee.rehiredAt's
 * doc comment in schema.prisma for why this reuses the same employeeNumber
 * rather than creating a new Employee row.
 */
export class RehireEmployeeDto {
  @IsString()
  actingEmployeeId!: string

  @ApiPropertyOptional({ description: "Defaults to today if omitted." })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  employmentStartDate?: Date

  @ApiPropertyOptional({ description: "Overrides the auto-generated previousReasonForLeaving snapshot." })
  @IsString()
  @IsOptional()
  comments?: string
}
