import { ArrayMinSize, IsArray, IsString } from "class-validator"

export class BulkAssignExitDocumentsDto {
  @IsString()
  employeeId!: string

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  documentTypeIds!: string[]

  @IsString()
  assignedById!: string
}
