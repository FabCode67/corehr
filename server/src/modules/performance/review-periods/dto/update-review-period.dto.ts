import { PartialType } from "@nestjs/swagger"

import { CreateReviewPeriodDto } from "./create-review-period.dto"

export class UpdateReviewPeriodDto extends PartialType(CreateReviewPeriodDto) {}
