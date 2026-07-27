import { IsEnum } from "class-validator"

import { PerformanceReviewType } from "@prisma/client"

export class SetCycleStatusDto {
  @IsEnum(PerformanceReviewType)
  cycle!: PerformanceReviewType
}
