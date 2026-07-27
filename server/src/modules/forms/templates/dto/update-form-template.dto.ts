import { OmitType, PartialType } from "@nestjs/swagger"

import { CreateFormTemplateDto } from "./create-form-template.dto"

/** formCode/createdById are fixed at creation. Editing these basic-info
 *  fields is always allowed, even once instances exist — only the field
 *  list and signature stages are locked once a template has instances (see
 *  FormTemplatesService). */
export class UpdateFormTemplateDto extends PartialType(OmitType(CreateFormTemplateDto, ["formCode", "createdById"] as const)) {}
