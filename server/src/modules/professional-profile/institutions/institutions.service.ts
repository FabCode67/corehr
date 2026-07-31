import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"

import { PrismaService } from "../../../prisma/prisma.service"
import { CreateInstitutionDto } from "./dto/create-institution.dto"
import { ReviewInstitutionDto } from "./dto/review-institution.dto"

@Injectable()
export class InstitutionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Powers the searchable dropdown — matches on name, country, or city
   *  (spec: "Search institution by name" / "by country" / "by location"),
   *  case-insensitive substring. Only VERIFIED institutions are offered by
   *  default so a not-yet-reviewed manual entry doesn't look like an
   *  established option to other employees — pass includeUnverified=true
   *  for the HR review list. */
  async search(query: string, includeUnverified = false) {
    if (!query || query.trim().length < 2) return []

    return this.prisma.academicInstitution.findMany({
      where: {
        ...(includeUnverified ? {} : { verificationStatus: "VERIFIED" }),
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { country: { contains: query, mode: "insensitive" } },
          { city: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { name: "asc" },
      take: 25,
    })
  }

  listPendingReview() {
    return this.prisma.academicInstitution.findMany({
      where: { verificationStatus: "PENDING_REVIEW" },
      include: { addedBy: { select: { employeeNumber: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "asc" },
    })
  }

  async findOne(id: string) {
    const institution = await this.prisma.academicInstitution.findUnique({ where: { id } })
    if (!institution) throw new NotFoundException(`Institution ${id} not found`)
    return institution
  }

  /** Manual "Not Found? Add Institution Manually" path. An HR admin adding
   *  one directly (e.g. while reviewing) is auto-verified — mirrors the same
   *  "HR entry is pre-vetted" rule used for Education/Certification. */
  async create(dto: CreateInstitutionDto) {
    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: dto.actingEmployeeId }, select: { isAdmin: true } })
    if (!actor) throw new BadRequestException("Acting employee not found.")

    return this.prisma.academicInstitution.create({
      data: {
        name: dto.name,
        country: dto.country,
        city: dto.city,
        website: dto.website,
        addedById: dto.actingEmployeeId,
        verificationStatus: actor.isAdmin ? "VERIFIED" : "PENDING_REVIEW",
        ...(actor.isAdmin ? { verifiedById: dto.actingEmployeeId, verifiedAt: new Date() } : {}),
      },
    })
  }

  async review(id: string, dto: ReviewInstitutionDto) {
    const institution = await this.findOne(id)
    if (institution.verificationStatus !== "PENDING_REVIEW") {
      throw new BadRequestException("This institution has already been reviewed.")
    }
    const reviewer = await this.prisma.employee.findUnique({ where: { employeeNumber: dto.actingEmployeeId }, select: { isAdmin: true } })
    if (!reviewer?.isAdmin) throw new BadRequestException("Only an HR administrator can review institutions.")

    return this.prisma.academicInstitution.update({
      where: { id },
      data: {
        verificationStatus: dto.decision,
        verifiedById: dto.actingEmployeeId,
        verifiedAt: new Date(),
        hrComment: dto.comment,
      },
    })
  }
}
