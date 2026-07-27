import { IsString } from "class-validator"

export class RejectWorkforcePlanDto {
  @IsString()
  actingEmployeeId!: string

  @IsString()
  rejectionComment!: string
}
