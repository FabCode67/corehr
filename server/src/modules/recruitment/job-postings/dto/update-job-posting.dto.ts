import { OmitType, PartialType } from "@nestjs/swagger"

import { CreateJobPostingDto } from "./create-job-posting.dto"

/** requisitionId is fixed at creation — everything else can be edited while
 *  the posting is still DRAFT. */
export class UpdateJobPostingDto extends PartialType(OmitType(CreateJobPostingDto, ["requisitionId"] as const)) {}
