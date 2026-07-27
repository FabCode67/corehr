import { IsString } from "class-validator"

export class RejectRequisitionDto {
  @IsString()
  actingEmployeeId!: string

  @IsString()
  rejectionComment!: string
}
