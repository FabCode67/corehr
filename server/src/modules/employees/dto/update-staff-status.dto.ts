import { IsIn } from "class-validator"

/**
 * Manual staff-status change for an employee who is still employed. Exit
 * statuses (Resigned, Terminated, Retired, Deceased, End of Contract) are
 * set through the Exit Management flow instead, and Probation is derived
 * from the probation end date — see common/staff-status.util.ts.
 */
export class UpdateStaffStatusDto {
  /** ACTIVE clears any Suspended/Disability status. */
  @IsIn(["ACTIVE", "SUSPENDED", "DISABILITY"])
  status!: "ACTIVE" | "SUSPENDED" | "DISABILITY"
}
