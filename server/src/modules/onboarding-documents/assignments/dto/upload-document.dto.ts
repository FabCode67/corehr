import { IsString } from "class-validator"

export class UploadDocumentDto {
  @IsString()
  actingEmployeeId!: string

  @IsString()
  fileUrl!: string
}
