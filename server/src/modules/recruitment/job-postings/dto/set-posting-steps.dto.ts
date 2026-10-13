import { ArrayMinSize, IsArray, IsString, IsUUID } from "class-validator"

/** Ordered stage-catalog ids — the hiring steps for one job posting. */
export class SetPostingStepsDto {
  @IsString()
  actingEmployeeId!: string

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("all", { each: true })
  stageIds!: string[]
}
