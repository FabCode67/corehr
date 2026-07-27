import { OmitType, PartialType } from "@nestjs/swagger"

import { CreateOfferDto } from "./create-offer.dto"

/** applicationId/createdById are fixed at creation — everything else can be
 *  edited while the offer is still DRAFT. */
export class UpdateOfferDto extends PartialType(OmitType(CreateOfferDto, ["applicationId", "createdById"] as const)) {}
