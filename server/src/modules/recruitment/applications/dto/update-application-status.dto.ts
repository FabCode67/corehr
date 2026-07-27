import { ApplicationStatus } from "@prisma/client"
import { IsEnum, IsString } from "class-validator"

export class UpdateApplicationStatusDto {
  @IsString()
  actingEmployeeId!: string

  @IsEnum(ApplicationStatus)
  status!: ApplicationStatus
}
