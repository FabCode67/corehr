import { IsString } from "class-validator"

export class InitiateExitDto {
  @IsString()
  actingEmployeeId!: string
}
