import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CreateBranchDto } from "./dto/create-branch.dto"
import { UpdateBranchDto } from "./dto/update-branch.dto"
import { BranchesService } from "./branches.service"

@ApiTags("Branches")
@Controller("branches")
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  findAll(
    @Query("includeInactive") includeInactive?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    if (page) {
      return this.branchesService.findAllPaginated(
        includeInactive === "true",
        Number(page),
        pageSize ? Number(pageSize) : undefined
      )
    }
    return this.branchesService.findAll(includeInactive === "true")
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.branchesService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.branchesService.remove(id)
  }

  @Patch(":id/activate")
  activate(@Param("id", ParseUUIDPipe) id: string) {
    return this.branchesService.activate(id)
  }
}
