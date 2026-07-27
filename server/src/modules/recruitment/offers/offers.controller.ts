import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { ActingEmployeeDto } from "./dto/acting-employee.dto"
import { CreateOfferDto } from "./dto/create-offer.dto"
import { UpdateOfferDto } from "./dto/update-offer.dto"
import { OffersService } from "./offers.service"

@ApiTags("Recruitment / Offers")
@Controller("recruitment/offers")
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  findAll(@Query("actingEmployeeId") actingEmployeeId: string, @Query("applicationId") applicationId?: string) {
    return this.offersService.findAll(applicationId, actingEmployeeId)
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.offersService.findOne(id, actingEmployeeId)
  }

  @Post()
  create(@Body() dto: CreateOfferDto, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.offersService.create(dto, actingEmployeeId)
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfferDto,
    @Query("actingEmployeeId") actingEmployeeId: string
  ) {
    return this.offersService.update(id, dto, actingEmployeeId)
  }

  @Post(":id/send")
  send(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ActingEmployeeDto) {
    return this.offersService.send(id, dto)
  }

  @Post(":id/accept")
  accept(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ActingEmployeeDto) {
    return this.offersService.accept(id, dto)
  }

  @Post(":id/decline")
  decline(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ActingEmployeeDto) {
    return this.offersService.decline(id, dto)
  }

  @Post(":id/expire")
  expire(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ActingEmployeeDto) {
    return this.offersService.expire(id, dto)
  }
}
