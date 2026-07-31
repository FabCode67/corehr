import { PartialType, OmitType } from "@nestjs/swagger"

import { CreateEducationRecordDto } from "./create-education-record.dto"

/** Editing resets verificationStatus back to PENDING_REVIEW if the record
 *  was previously VERIFIED/REJECTED — see EducationRecordsService.update():
 *  HR verified the *submitted* facts, so a changed record needs a fresh
 *  look, same principle as OnboardingDocumentAssignment's resubmission flow. */
export class UpdateEducationRecordDto extends PartialType(OmitType(CreateEducationRecordDto, ["employeeId"] as const)) {}
