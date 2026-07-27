import { IsString } from "class-validator"

export class AssignGrievanceDto {
  @IsString()
  actingEmployeeId!: string

  @IsString()
  assignedToId!: string
}
