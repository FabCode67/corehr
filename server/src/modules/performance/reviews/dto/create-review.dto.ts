import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator"

import { PerformanceReviewType } from "@prisma/client"

export class CreateReviewDto {
  @IsUUID()
  periodId!: string

  @IsString()
  employeeId!: string

  @IsEnum(PerformanceReviewType)
  reviewType!: PerformanceReviewType

  /** Employee initiating the create — used to resolve access + default reviewer. */
  @IsString()
  actingEmployeeId!: string

  /** Optional explicit reviewer override; defaults to the employee's resolved reporting manager. */
  @IsString()
  @IsOptional()
  reviewerId?: string
}
