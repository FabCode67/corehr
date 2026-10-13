import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator"

/** Multipart text fields of the public apply form (files travel alongside). */
export class PublicApplyDto {
  @IsString() @MinLength(1) @MaxLength(80) firstName!: string
  @IsString() @MinLength(1) @MaxLength(80) lastName!: string
  @IsEmail() @MaxLength(160) email!: string
  @IsString() @MinLength(5) @MaxLength(40) phone!: string
  @IsString() @MinLength(2) @MaxLength(80) nationality!: string

  @IsString() @IsOptional() @MaxLength(4000) education?: string
  @IsString() @IsOptional() @MaxLength(4000) experience?: string
  @IsString() @IsOptional() @MaxLength(2000) certifications?: string
  @IsString() @IsOptional() @MaxLength(2000) skills?: string
  @IsString() @IsOptional() @MaxLength(300) linkedinUrl?: string
  @IsString() @IsOptional() @MaxLength(160) currentEmployer?: string
  @IsString() @IsOptional() @MaxLength(160) currentPosition?: string
  @IsString() @IsOptional() @MaxLength(3000) coverNote?: string
}
