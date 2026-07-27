import { IsArray, IsUUID } from "class-validator"

/** The full list of this template's field ids, in the desired new order —
 *  simpler than per-field order patches for a reorderable list UI. */
export class ReorderFieldsDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  fieldIds!: string[]
}
