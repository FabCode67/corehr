import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from "class-validator"

export class CreateDepartmentDto {
  @IsUUID()
  functionId!: string

  @MaxLength(150)
  @IsString()
  name!: string

  @ApiPropertyOptional()
  @MaxLength(20)
  @IsString()
  @IsOptional()
  code?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @ApiPropertyOptional({ description: "Genuine Department-to-Department hierarchy — distinct from functionId. See Department.parentDepartmentId's schema doc comment." })
  @IsUUID()
  @IsOptional()
  parentDepartmentId?: string

  @ApiPropertyOptional({ description: "Employee.employeeNumber of this department's designated Head of Department — see Department.headOfDepartmentId's schema doc comment." })
  @IsString()
  @IsOptional()
  headOfDepartmentId?: string

  @ApiPropertyOptional({ description: "Employee.employeeNumber of this department's temporary Acting Head of Department (covering while the real head is out, or the position is vacant) — grants identical access. See Department.actingHeadOfDepartmentId's schema doc comment." })
  @IsString()
  @IsOptional()
  actingHeadOfDepartmentId?: string
}
