import { IsOptional, IsString } from "class-validator"

/** HR review decision — comment is optional when forwarding, required by the service when returning/rejecting. */
export class ReviewRequisitionDto {
  @IsString()
  actingEmployeeId!: string

  @IsString()
  @IsOptional()
  comment?: string
}
