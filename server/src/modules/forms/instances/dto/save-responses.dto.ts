import { Type } from "class-transformer"
import { IsArray, IsDefined, IsString, IsUUID, ValidateNested } from "class-validator"

export class FieldResponseInputDto {
  @IsUUID()
  formFieldId!: string

  /** Deliberately untyped — shape depends on the field's FieldType, see the
   *  schema's module doc comment on FormFieldResponse.value.
   *
   *  Needs *some* class-validator decorator, even though there's nothing
   *  meaningful to validate here: main.ts's global ValidationPipe runs with
   *  `whitelist: true` + `forbidNonWhitelisted: true`, which only lets a
   *  property through if class-validator's metadata scanner knows about it
   *  — a bare `value: unknown` with zero decorators is invisible to that
   *  scanner and gets stripped/rejected ("property value should not
   *  exist"), even though it's a real, intentionally-typed field. @IsDefined
   *  registers the property (so it survives whitelisting) while only
   *  requiring it not be `undefined` — the client always sends `null` for
   *  an unanswered field, never omits the key entirely, so this doesn't
   *  reject legitimate blank responses. */
  @IsDefined()
  value: unknown
}

export class SaveResponsesDto {
  @IsString()
  actingEmployeeId!: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldResponseInputDto)
  responses!: FieldResponseInputDto[]
}
