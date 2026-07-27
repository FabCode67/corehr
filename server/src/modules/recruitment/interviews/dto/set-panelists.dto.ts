import { ArrayUnique, IsArray, IsString } from "class-validator"

export class SetPanelistsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  panelistIds!: string[]
}
