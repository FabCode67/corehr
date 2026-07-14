import { IsInt } from "class-validator"

/** HR manual correction — sets the balance's adjustmentDays to an explicit
 *  total (not a delta), so the admin UI can just show "current adjustment"
 *  as an editable number. */
export class AdjustBalanceDto {
  @IsInt()
  adjustmentDays!: number
}
