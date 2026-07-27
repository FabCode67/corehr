import { IsString } from "class-validator"

/** Shared minimal body for the simple lifecycle transitions (accept/start)
 *  that only need to know who's acting. */
export class ActingEmployeeDto {
  @IsString()
  actingEmployeeId!: string
}
