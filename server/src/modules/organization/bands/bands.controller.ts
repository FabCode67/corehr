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

import { CreateBandDto } from "./dto/create-band.dto"
import { UpdateBandDto } from "./dto/update-band.dto"
import { BandsService } from "./bands.service"

@ApiTags("Organization / Bands")
@Controller("organization/bands")
export class BandsController {
  constructor(private readonly bandsService: BandsService) {}

  @Get()
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.bandsService.findAll(includeInactive === "true")
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.bandsService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateBandDto) {
    return this.bandsService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateBandDto) {
    return this.bandsService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.bandsService.remove(id)
  }
}
