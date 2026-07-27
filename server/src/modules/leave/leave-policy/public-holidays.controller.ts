import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateHolidayDto, UpdateHolidayDto } from "./dto/leave-policy.dto"
import { PublicHolidaysService } from "./public-holidays.service"

@ApiTags("Leave / Public Holidays")
@Controller("leave/holidays")
export class PublicHolidaysController {
  constructor(private readonly publicHolidaysService: PublicHolidaysService) {}

  @Get()
  findAll(
    @Query("includeInactive") includeInactive?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    if (page) {
      return this.publicHolidaysService.findAllPaginated(
        includeInactive === "true",
        Number(page),
        pageSize ? Number(pageSize) : undefined
      )
    }
    return this.publicHolidaysService.findAll(includeInactive === "true")
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.publicHolidaysService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateHolidayDto) {
    return this.publicHolidaysService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateHolidayDto) {
    return this.publicHolidaysService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.publicHolidaysService.remove(id)
  }
}
