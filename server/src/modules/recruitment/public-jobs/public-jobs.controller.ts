import { Body, Controller, Get, Param, Post, UploadedFiles, UseInterceptors } from "@nestjs/common"
import { AnyFilesInterceptor } from "@nestjs/platform-express"
import { ApiConsumes, ApiTags } from "@nestjs/swagger"
import { Throttle } from "@nestjs/throttler"

import { Public } from "../../auth/public.decorator"

import { PublicApplyDto } from "./dto/public-apply.dto"
import { PublicJobsService } from "./public-jobs.service"

/** Unauthenticated endpoints behind the shareable job link (/jobs/<slug>). */
@ApiTags("Public / Jobs")
@Public()
@Controller("public/jobs")
export class PublicJobsController {
  constructor(private readonly service: PublicJobsService) {}

  @Get()
  list() {
    return this.service.listOpen()
  }

  @Get(":slug")
  get(@Param("slug") slug: string) {
    return this.service.getBySlug(slug)
  }

  @Post(":slug/apply")
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: 5 * 1024 * 1024, files: 10 } }))
  apply(@Param("slug") slug: string, @Body() dto: PublicApplyDto, @UploadedFiles() files: Express.Multer.File[]) {
    return this.service.apply(slug, dto, files ?? [])
  }
}
