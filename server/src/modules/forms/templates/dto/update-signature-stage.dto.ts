import { PartialType } from "@nestjs/swagger"

import { CreateSignatureStageDto } from "./create-signature-stage.dto"

export class UpdateSignatureStageDto extends PartialType(CreateSignatureStageDto) {}
