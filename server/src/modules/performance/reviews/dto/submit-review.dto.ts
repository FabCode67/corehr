import { IsString } from "class-validator"

export class SubmitReviewDto {
  @IsString()
  actingEmployeeId!: string
}
