import { IsString } from "class-validator"

/** One choice for DROPDOWN/RADIO/CHECKBOX/MULTI_SELECT fields. */
export class FieldOptionDto {
  @IsString()
  value!: string

  @IsString()
  label!: string
}

/** One column for a TABLE field (e.g. Education Details: Qualification /
 *  Institution / Year). `type` is a plain string naming one of the simple
 *  field types (SHORT_TEXT, NUMBER, DATE, ...) — deliberately not the full
 *  FieldType enum, since a table column can't itself contain a table. */
export class TableColumnDto {
  @IsString()
  key!: string

  @IsString()
  label!: string

  @IsString()
  type!: string
}
