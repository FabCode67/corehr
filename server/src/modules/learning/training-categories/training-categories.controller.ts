import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateTrainingCategoryDto } from "./dto/create-training-category.dto"
import { UpdateTrainingCategoryDto } from "./dto/update-training-category.dto"
import { TrainingCategoriesService } from "./training-categories.service"

@ApiTags("Learning / Training Categories")
@Controller("learning/training-categories")
export class TrainingCategoriesController {
  constructor(private readonly trainingCategoriesService: TrainingCategoriesService) {}

  @Get()
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.trainingCategoriesService.findAll(includeInactive === "true")
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.trainingCategoriesService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateTrainingCategoryDto) {
    return this.trainingCategoriesService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateTrainingCategoryDto) {
    return this.trainingCategoriesService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.trainingCategoriesService.remove(id)
  }
}
