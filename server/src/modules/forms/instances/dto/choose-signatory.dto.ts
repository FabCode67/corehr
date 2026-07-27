import { IsString } from "class-validator"

export class ChooseSignatoryDto {
  @IsString()
  actingEmployeeId!: string

  @IsString()
  signerId!: string
}
