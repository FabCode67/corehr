import { OmitType, PartialType } from "@nestjs/swagger"

import { CreateDisciplinaryCaseDto } from "./create-disciplinary-case.dto"

/** The employee and who reported them are fixed at creation — everything
 *  else can be amended by HR at any time (there's no Forms-Management-style
 *  "locked once submitted" rule for case details, only for its status
 *  transitions, which have their own dedicated endpoints). */
export class UpdateDisciplinaryCaseDto extends PartialType(OmitType(CreateDisciplinaryCaseDto, ["employeeId", "reportedById"] as const)) {}
