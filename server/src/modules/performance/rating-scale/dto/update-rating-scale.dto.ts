import { PartialType } from "@nestjs/swagger"

import { CreateRatingScaleDto } from "./create-rating-scale.dto"

export class UpdateRatingScaleDto extends PartialType(CreateRatingScaleDto) {}
