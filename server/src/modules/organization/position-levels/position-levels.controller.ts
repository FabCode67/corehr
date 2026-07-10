import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreatePositionLevelDto } from "./dto/create-position-level.dto"
import { UpdatePositionLevelDto } from "./dto/update-position-level.dto"
import { PositionLevelsService } from "./position-levels.service"

@ApiTags("Organization / Position Levels")
@Controller("organization/position-levels")
export class PositionLevelsController {
  constructor(private readonly positionLevelsService: PositionLevelsService) {}

  @Get()
  findAll() {
    return this.positionLevelsService.findAll()
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.positionLevelsService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreatePositionLevelDto) {
    return this.positionLevelsService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdatePositionLevelDto) {
    return this.positionLevelsService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.positionLevelsService.remove(id)
  }
}
