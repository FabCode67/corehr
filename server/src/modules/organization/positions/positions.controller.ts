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

import { CreatePositionDto } from "./dto/create-position.dto"
import { UpdatePositionDto } from "./dto/update-position.dto"
import { PositionsService } from "./positions.service"

@ApiTags("Organization / Positions")
@Controller("organization/positions")
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get()
  findAll(
    @Query("departmentId") departmentId?: string,
    @Query("unitId") unitId?: string,
    @Query("reportsToPositionId") reportsToPositionId?: string,
    @Query("includeInactive") includeInactive?: string
  ) {
    return this.positionsService.findAll({
      departmentId,
      unitId,
      reportsToPositionId,
      includeInactive: includeInactive === "true",
    })
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.positionsService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreatePositionDto) {
    return this.positionsService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdatePositionDto) {
    return this.positionsService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.positionsService.remove(id)
  }
}
