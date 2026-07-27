import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateSanctionTypeDto } from "./dto/create-sanction-type.dto"
import { UpdateSanctionTypeDto } from "./dto/update-sanction-type.dto"
import { SanctionTypesService } from "./sanction-types.service"

@ApiTags("Employee Relations / Sanction Types")
@Controller("employee-relations/sanction-types")
export class SanctionTypesController {
  constructor(private readonly sanctionTypesService: SanctionTypesService) {}

  @Get()
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.sanctionTypesService.findAll(includeInactive === "true")
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.sanctionTypesService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateSanctionTypeDto) {
    return this.sanctionTypesService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateSanctionTypeDto) {
    return this.sanctionTypesService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.sanctionTypesService.remove(id)
  }
}
