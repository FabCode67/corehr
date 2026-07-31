import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { ApiConsumes, ApiTags } from "@nestjs/swagger"

import { ImportsService } from "./imports.service"
import { MAX_IMPORT_FILE_SIZE_BYTES } from "./spreadsheet.util"

/**
 * Route order matters here (see the codebase-wide convention of putting
 * literal-segment routes before param routes, e.g. EmployeesController's
 * "line-managers" before ":id") — every "jobs/..." route is declared before
 * the generic ":module/..." routes so a job id can never be mistaken for a
 * module key.
 */
@ApiTags("Bulk Import")
@Controller("imports")
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Get("jobs")
  listHistory(@Query("module") module?: string, @Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    return this.importsService.listHistory({
      module,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
  }

  @Get("jobs/:id")
  getJob(@Param("id") id: string) {
    return this.importsService.getJob(id)
  }

  @Post("jobs/:id/commit")
  commit(@Param("id") id: string, @Body("actingEmployeeId") actingEmployeeId: string) {
    return this.importsService.commit(id, actingEmployeeId)
  }

  @Post("jobs/:id/reimport")
  reimport(@Param("id") id: string, @Body("actingEmployeeId") actingEmployeeId: string) {
    return this.importsService.reimportAsDraft(id, actingEmployeeId)
  }

  @Get("jobs/:id/file")
  async downloadFile(@Param("id") id: string) {
    const { buffer, fileName, mimeType } = await this.importsService.downloadOriginalFile(id)
    return new StreamableFile(buffer, { type: mimeType, disposition: `attachment; filename="${fileName}"` })
  }

  @Get("jobs/:id/error-report")
  @Header("Content-Type", "text/csv")
  async downloadErrorReport(@Param("id") id: string) {
    const { buffer, fileName } = await this.importsService.downloadErrorReport(id)
    return new StreamableFile(buffer, { disposition: `attachment; filename="${fileName}"` })
  }

  @Get("jobs/:id/success-report")
  @Header("Content-Type", "text/csv")
  async downloadSuccessReport(@Param("id") id: string) {
    const { buffer, fileName } = await this.importsService.downloadSuccessReport(id)
    return new StreamableFile(buffer, { disposition: `attachment; filename="${fileName}"` })
  }

  @Get("modules")
  listModules() {
    return this.importsService.listModules()
  }

  @Get(":module/template")
  @Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  downloadTemplate(@Param("module") module: string) {
    const { buffer, fileName } = this.importsService.downloadTemplate(module)
    return new StreamableFile(buffer, { disposition: `attachment; filename="${fileName}"` })
  }

  @Post(":module/preview")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_IMPORT_FILE_SIZE_BYTES } }))
  async preview(
    @Param("module") module: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("actingEmployeeId") actingEmployeeId: string
  ) {
    if (!file) throw new BadRequestException("No file uploaded.")
    if (!actingEmployeeId) throw new BadRequestException("actingEmployeeId is required.")
    return this.importsService.preview(module, file, actingEmployeeId)
  }
}
