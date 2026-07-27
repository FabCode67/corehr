import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateInstitutionDto } from "./dto/create-institution.dto"
import { UpdateInstitutionDto } from "./dto/update-institution.dto"
import { InstitutionsService } from "./institutions.service"

@ApiTags("Learning / Institutions")
@Controller("learning/institutions")
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @Get()
  findAll(
    @Query("includeInactive") includeInactive?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    if (page) {
      return this.institutionsService.findAllPaginated(
        includeInactive === "true",
        Number(page),
        pageSize ? Number(pageSize) : undefined
      )
    }
    return this.institutionsService.findAll(includeInactive === "true")
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.institutionsService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateInstitutionDto) {
    return this.institutionsService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateInstitutionDto) {
    return this.institutionsService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.institutionsService.remove(id)
  }
}
