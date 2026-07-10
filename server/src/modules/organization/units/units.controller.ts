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

import { CreateUnitDto } from "./dto/create-unit.dto"
import { UpdateUnitDto } from "./dto/update-unit.dto"
import { UnitsService } from "./units.service"

@ApiTags("Organization / Units")
@Controller("organization/units")
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  findAll(
    @Query("departmentId") departmentId?: string,
    @Query("includeInactive") includeInactive?: string
  ) {
    return this.unitsService.findAll({
      departmentId,
      includeInactive: includeInactive === "true",
    })
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.unitsService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateUnitDto) {
    return this.unitsService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateUnitDto) {
    return this.unitsService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.unitsService.remove(id)
  }
}
