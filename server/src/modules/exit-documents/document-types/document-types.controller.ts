import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateExitDocumentTypeDto } from "./dto/create-exit-document-type.dto"
import { UpdateExitDocumentTypeDto } from "./dto/update-exit-document-type.dto"
import { ExitDocumentTypesService } from "./document-types.service"

@ApiTags("Exit Documents / Document Types")
@Controller("exit-documents/document-types")
export class ExitDocumentTypesController {
  constructor(private readonly documentTypesService: ExitDocumentTypesService) {}

  @Get()
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.documentTypesService.findAll(includeInactive === "true")
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.documentTypesService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateExitDocumentTypeDto) {
    return this.documentTypesService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateExitDocumentTypeDto) {
    return this.documentTypesService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.documentTypesService.remove(id)
  }
}
