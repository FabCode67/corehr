import { IsString } from "class-validator"

/** Shared minimal body for simple lifecycle transitions (submit) that only
 *  need to know who's acting — same pattern as Learning's ActingEmployeeDto. */
export class ActingEmployeeDto {
  @IsString()
  actingEmployeeId!: string
}
