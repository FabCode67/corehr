import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateDocumentTypeDto } from "./dto/create-document-type.dto"
import { UpdateDocumentTypeDto } from "./dto/update-document-type.dto"
import { DocumentTypesService } from "./document-types.service"

@ApiTags("Onboarding Documents / Document Types")
@Controller("onboarding-documents/document-types")
export class DocumentTypesController {
  constructor(private readonly documentTypesService: DocumentTypesService) {}

  @Get()
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.documentTypesService.findAll(includeInactive === "true")
  }

  @Get("applicable")
  findApplicable(
    @Query("contractType") contractType?: string,
    @Query("functionId") functionId?: string,
    @Query("departmentId") departmentId?: string,
    @Query("positionId") positionId?: string,
    @Query("bandId") bandId?: string
  ) {
    return this.documentTypesService.findApplicable({ contractType, functionId, departmentId, positionId, bandId })
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.documentTypesService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateDocumentTypeDto) {
    return this.documentTypesService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateDocumentTypeDto) {
    return this.documentTypesService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.documentTypesService.remove(id)
  }
}
