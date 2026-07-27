import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateFormFieldDto } from "./dto/create-form-field.dto"
import { CreateFormTemplateDto } from "./dto/create-form-template.dto"
import { CreateSignatureStageDto } from "./dto/create-signature-stage.dto"
import { ReorderFieldsDto } from "./dto/reorder-fields.dto"
import { UpdateFormFieldDto } from "./dto/update-form-field.dto"
import { UpdateFormTemplateDto } from "./dto/update-form-template.dto"
import { UpdateSignatureStageDto } from "./dto/update-signature-stage.dto"
import { FormTemplatesService, type FormTemplateFilters } from "./form-templates.service"

@ApiTags("Forms / Templates")
@Controller("forms/templates")
export class FormTemplatesController {
  constructor(private readonly formTemplatesService: FormTemplatesService) {}

  @Get()
  findAll(@Query("categoryId") categoryId?: string, @Query("status") status?: string) {
    const filters: FormTemplateFilters = { categoryId, status }
    return this.formTemplatesService.findAll(filters)
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.formTemplatesService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateFormTemplateDto) {
    return this.formTemplatesService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateFormTemplateDto) {
    return this.formTemplatesService.update(id, dto)
  }

  @Post(":id/publish")
  publish(@Param("id", ParseUUIDPipe) id: string) {
    return this.formTemplatesService.publish(id)
  }

  @Post(":id/archive")
  archive(@Param("id", ParseUUIDPipe) id: string) {
    return this.formTemplatesService.archive(id)
  }

  @Post(":id/new-version")
  createNewVersion(@Param("id", ParseUUIDPipe) id: string) {
    return this.formTemplatesService.createNewVersion(id)
  }

  @Post(":id/fields")
  addField(@Param("id", ParseUUIDPipe) id: string, @Body() dto: CreateFormFieldDto) {
    return this.formTemplatesService.addField(id, dto)
  }

  @Patch(":id/fields/:fieldId")
  updateField(@Param("id", ParseUUIDPipe) id: string, @Param("fieldId", ParseUUIDPipe) fieldId: string, @Body() dto: UpdateFormFieldDto) {
    return this.formTemplatesService.updateField(id, fieldId, dto)
  }

  @Delete(":id/fields/:fieldId")
  removeField(@Param("id", ParseUUIDPipe) id: string, @Param("fieldId", ParseUUIDPipe) fieldId: string) {
    return this.formTemplatesService.removeField(id, fieldId)
  }

  @Patch(":id/fields")
  reorderFields(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ReorderFieldsDto) {
    return this.formTemplatesService.reorderFields(id, dto)
  }

  @Post(":id/stages")
  addStage(@Param("id", ParseUUIDPipe) id: string, @Body() dto: CreateSignatureStageDto) {
    return this.formTemplatesService.addStage(id, dto)
  }

  @Patch(":id/stages/:stageId")
  updateStage(@Param("id", ParseUUIDPipe) id: string, @Param("stageId", ParseUUIDPipe) stageId: string, @Body() dto: UpdateSignatureStageDto) {
    return this.formTemplatesService.updateStage(id, stageId, dto)
  }

  @Delete(":id/stages/:stageId")
  removeStage(@Param("id", ParseUUIDPipe) id: string, @Param("stageId", ParseUUIDPipe) stageId: string) {
    return this.formTemplatesService.removeStage(id, stageId)
  }
}
