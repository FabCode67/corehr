import { AppealOutcome } from "@prisma/client"
import { IsEnum, IsString } from "class-validator"

export class DecideAppealDto {
  @IsString()
  actingEmployeeId!: string

  @IsEnum(AppealOutcome)
  outcome!: AppealOutcome

  @IsString()
  decisionComments!: string
}
