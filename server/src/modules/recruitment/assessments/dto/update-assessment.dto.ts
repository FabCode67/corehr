import { OmitType, PartialType } from "@nestjs/swagger"

import { CreateAssessmentDto } from "./create-assessment.dto"

/** applicationId/assessmentType are fixed at creation — everything else
 *  (schedule, evaluator) can be edited before the result is recorded. */
export class UpdateAssessmentDto extends PartialType(
  OmitType(CreateAssessmentDto, ["applicationId", "assessmentType"] as const)
) {}
