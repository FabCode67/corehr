import { Controller, Get, Header, Param, ParseUUIDPipe, Query, StreamableFile } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { DisciplinaryCasesService } from "../cases/disciplinary-cases.service"

import { CasePdfService } from "./case-pdf.service"

@ApiTags("Employee Relations / PDF Export")
@Controller("employee-relations/cases")
export class CasePdfController {
  constructor(
    private readonly casesService: DisciplinaryCasesService,
    private readonly casePdfService: CasePdfService
  ) {}

  @Get(":id/pdf")
  @Header("Content-Type", "application/pdf")
  async downloadPdf(@Param("id", ParseUUIDPipe) id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    const disciplinaryCase = await this.casesService.findOne(id, actingEmployeeId)
    const buffer = await this.casePdfService.generate(disciplinaryCase)
    return new StreamableFile(buffer, {
      disposition: `attachment; filename="${disciplinaryCase.caseNumber}.pdf"`,
    })
  }
}
