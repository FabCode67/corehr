import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateFormCategoryDto } from "./dto/create-form-category.dto"
import { UpdateFormCategoryDto } from "./dto/update-form-category.dto"
import { FormCategoriesService } from "./form-categories.service"

@ApiTags("Forms / Categories")
@Controller("forms/categories")
export class FormCategoriesController {
  constructor(private readonly formCategoriesService: FormCategoriesService) {}

  @Get()
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.formCategoriesService.findAll(includeInactive === "true")
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.formCategoriesService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateFormCategoryDto) {
    return this.formCategoriesService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateFormCategoryDto) {
    return this.formCategoriesService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.formCategoriesService.remove(id)
  }
}
