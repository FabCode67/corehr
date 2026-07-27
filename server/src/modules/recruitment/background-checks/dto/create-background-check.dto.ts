import { BackgroundCheckType } from "@prisma/client"
import { IsEnum, IsUUID } from "class-validator"

export class CreateBackgroundCheckDto {
  @IsUUID()
  applicationId!: string

  @IsEnum(BackgroundCheckType)
  checkType!: BackgroundCheckType
}
