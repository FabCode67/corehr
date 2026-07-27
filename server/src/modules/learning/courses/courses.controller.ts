import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateCourseDto } from "./dto/create-course.dto"
import { UpdateCourseDto } from "./dto/update-course.dto"
import { CoursesService, type CourseFilters } from "./courses.service"

@ApiTags("Learning / Courses")
@Controller("learning/courses")
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  findAll(
    @Query("categoryId") categoryId?: string,
    @Query("institutionId") institutionId?: string,
    @Query("deliveryMethod") deliveryMethod?: string,
    @Query("includeInactive") includeInactive?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    const filters: CourseFilters = {
      categoryId,
      institutionId,
      deliveryMethod,
      includeInactive: includeInactive === "true",
    }
    if (page) {
      return this.coursesService.findAllPaginated(filters, Number(page), pageSize ? Number(pageSize) : undefined)
    }
    return this.coursesService.findAll(filters)
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.coursesService.findOne(id)
  }

  @Get(":id/eligible-employees")
  findEligibleEmployees(@Param("id", ParseUUIDPipe) id: string) {
    return this.coursesService.findEligibleEmployees(id)
  }

  @Post()
  create(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.update(id, dto)
  }

  @Patch(":id/deactivate")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.coursesService.remove(id)
  }
}
