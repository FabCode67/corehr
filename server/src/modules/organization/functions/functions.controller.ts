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

import { CreateFunctionDto } from "./dto/create-function.dto"
import { UpdateFunctionDto } from "./dto/update-function.dto"
import { FunctionsService } from "./functions.service"

@ApiTags("Organization / Functions")
@Controller("organization/functions")
export class FunctionsController {
  constructor(private readonly functionsService: FunctionsService) {}

  @Get()
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.functionsService.findAll(includeInactive === "true")
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.functionsService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateFunctionDto) {
    return this.functionsService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateFunctionDto) {
    return this.functionsService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.functionsService.remove(id)
  }
}
