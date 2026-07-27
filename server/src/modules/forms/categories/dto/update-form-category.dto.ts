import { PartialType } from "@nestjs/swagger"

import { CreateFormCategoryDto } from "./create-form-category.dto"

export class UpdateFormCategoryDto extends PartialType(CreateFormCategoryDto) {}
