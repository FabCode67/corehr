import { IsString } from "class-validator"

export class ActingEmployeeDto {
  @IsString()
  actingEmployeeId!: string
}
