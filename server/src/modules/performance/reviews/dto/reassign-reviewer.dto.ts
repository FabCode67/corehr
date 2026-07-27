import { IsString } from "class-validator"

export class ReassignReviewerDto {
  @IsString()
  actingEmployeeId!: string

  @IsString()
  reviewerId!: string
}
