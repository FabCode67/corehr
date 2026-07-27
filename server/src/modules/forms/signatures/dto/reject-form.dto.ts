import { IsString } from "class-validator"

export class RejectFormDto {
  @IsString()
  actingEmployeeId!: string

  @IsString()
  comments!: string
}
