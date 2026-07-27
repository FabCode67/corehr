import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { CandidatesService } from "./candidates.service"
import { CreateCandidateDto } from "./dto/create-candidate.dto"
import { UpdateCandidateDto } from "./dto/update-candidate.dto"

@ApiTags("Recruitment / Candidates")
@Controller("recruitment/candidates")
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Get()
  findAll(@Query("search") search?: string, @Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    if (page) {
      return this.candidatesService.findAllPaginated(search, Number(page), pageSize ? Number(pageSize) : undefined)
    }
    return this.candidatesService.findAll(search)
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.candidatesService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateCandidateDto) {
    return this.candidatesService.create(dto)
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateCandidateDto) {
    return this.candidatesService.update(id, dto)
  }
}
