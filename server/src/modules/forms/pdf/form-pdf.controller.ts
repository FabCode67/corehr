import { Controller, Get, Header, Param, ParseUUIDPipe, Query, StreamableFile } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { FormInstancesService } from "../instances/form-instances.service"

import { FormPdfService } from "./form-pdf.service"

@ApiTags("Forms / PDF Export")
@Controller("forms/instances")
export class FormPdfController {
  constructor(
    private readonly formInstancesService: FormInstancesService,
    private readonly formPdfService: FormPdfService
  ) {}

  @Get(":id/pdf")
  @Header("Content-Type", "application/pdf")
  async downloadPdf(@Param("id", ParseUUIDPipe) id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    const instance = await this.formInstancesService.findOne(id, actingEmployeeId)
    const buffer = await this.formPdfService.generate(instance)
    return new StreamableFile(buffer, {
      disposition: `attachment; filename="${instance.formTemplate.formCode}-${instance.id}.pdf"`,
    })
  }
}
