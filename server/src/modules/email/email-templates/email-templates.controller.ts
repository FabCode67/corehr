import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateEmailTemplateDto } from "./dto/create-email-template.dto"
import { UpdateEmailTemplateDto } from "./dto/update-email-template.dto"
import { EmailTemplatesService } from "./email-templates.service"

@ApiTags("Email / Templates")
@Controller("email-templates")
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Get()
  findAll(@Query("category") category?: string) {
    return this.emailTemplatesService.findAll(category)
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.emailTemplatesService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateEmailTemplateDto) {
    return this.emailTemplatesService.create(dto)
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.emailTemplatesService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.emailTemplatesService.remove(id)
  }
}
