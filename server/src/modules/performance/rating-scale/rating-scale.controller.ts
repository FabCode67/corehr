import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateRatingScaleDto } from "./dto/create-rating-scale.dto"
import { UpdateRatingScaleDto } from "./dto/update-rating-scale.dto"
import { RatingScaleService } from "./rating-scale.service"

@ApiTags("Performance / Rating Scale")
@Controller("performance/rating-scale")
export class RatingScaleController {
  constructor(private readonly ratingScaleService: RatingScaleService) {}

  @Get()
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.ratingScaleService.findAll(includeInactive === "true")
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.ratingScaleService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateRatingScaleDto) {
    return this.ratingScaleService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateRatingScaleDto) {
    return this.ratingScaleService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.ratingScaleService.remove(id)
  }
}
