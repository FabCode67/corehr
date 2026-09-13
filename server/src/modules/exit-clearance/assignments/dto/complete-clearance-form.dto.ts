import { IsString } from "class-validator"

export class CompleteClearanceFormDto {
  @IsString()
  employeeId!: string
}
