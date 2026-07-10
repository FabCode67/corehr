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

import { CreateDepartmentDto } from "./dto/create-department.dto"
import { UpdateDepartmentDto } from "./dto/update-department.dto"
import { DepartmentsService } from "./departments.service"

@ApiTags("Organization / Departments")
@Controller("organization/departments")
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  findAll(
    @Query("functionId") functionId?: string,
    @Query("includeInactive") includeInactive?: string
  ) {
    return this.departmentsService.findAll({
      functionId,
      includeInactive: includeInactive === "true",
    })
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.departmentsService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.departmentsService.remove(id)
  }
}
