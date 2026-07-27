import { Body, Controller, Param, ParseUUIDPipe, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { RejectFormDto } from "./dto/reject-form.dto"
import { SignFormDto } from "./dto/sign-form.dto"
import { FormSignaturesService } from "./form-signatures.service"

@ApiTags("Forms / Signatures")
@Controller("forms/signatures")
export class FormSignaturesController {
  constructor(private readonly formSignaturesService: FormSignaturesService) {}

  @Post(":id/sign")
  sign(@Param("id", ParseUUIDPipe) id: string, @Body() dto: SignFormDto) {
    return this.formSignaturesService.sign(id, dto)
  }

  @Post(":id/reject")
  reject(@Param("id", ParseUUIDPipe) id: string, @Body() dto: RejectFormDto) {
    return this.formSignaturesService.reject(id, dto)
  }

  @Post(":id/return")
  returnForCorrection(@Param("id", ParseUUIDPipe) id: string, @Body() dto: RejectFormDto) {
    return this.formSignaturesService.returnForCorrection(id, dto)
  }
}
