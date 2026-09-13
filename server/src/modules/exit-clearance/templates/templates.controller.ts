import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateClearanceFormTemplateDto } from "./dto/create-clearance-form-template.dto"
import { UpdateClearanceFormTemplateDto } from "./dto/update-clearance-form-template.dto"
import { ClearanceFormTemplatesService } from "./templates.service"

@ApiTags("Exit Clearance / Templates")
@Controller("exit-clearance/templates")
export class ClearanceFormTemplatesController {
  constructor(private readonly templatesService: ClearanceFormTemplatesService) {}

  @Get()
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.templatesService.findAll(includeInactive === "true")
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.templatesService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateClearanceFormTemplateDto) {
    return this.templatesService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateClearanceFormTemplateDto) {
    return this.templatesService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.templatesService.remove(id)
  }
}
