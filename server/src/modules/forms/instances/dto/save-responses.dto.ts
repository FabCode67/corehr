import { Type } from "class-transformer"
import { IsArray, IsString, IsUUID, ValidateNested } from "class-validator"

export class FieldResponseInputDto {
  @IsUUID()
  formFieldId!: string

  /** Deliberately untyped — shape depends on the field's FieldType, see the
   *  schema's module doc comment on FormFieldResponse.value. */
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
