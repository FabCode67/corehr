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

    const local = await this.prisma.academicInstitution.findMany({
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

    // HR review lists only care about what's in our own catalog.
    if (includeUnverified || query.trim().length < 3) return local

    // Top up from the public universities directory so staff can find
    // schools that aren't in our catalog yet (LinkedIn-style search). Results
    // have no id — the client imports one into the catalog when it's picked
    // (see importFromDirectory()).
    const directory = await this.searchDirectory(query.trim())
    const known = new Set(local.map((i) => i.name.trim().toLowerCase()))
    const extra = directory
      .filter((d) => !known.has(d.name.trim().toLowerCase()))
      .slice(0, Math.max(0, 25 - local.length))
      .map((d) => ({ id: "", name: d.name, country: d.country, city: null, website: d.website, source: "directory" as const }))

    return [...local, ...extra]
  }

  /** Free public directory (universities.hipolabs.com, no API key). Best
   *  effort: a slow/unavailable directory must never break the search, so
   *  any failure just yields no extra results. */
  private async searchDirectory(query: string): Promise<{ name: string; country: string | null; website: string | null }[]> {
    try {
      const response = await fetch(`http://universities.hipolabs.com/search?name=${encodeURIComponent(query)}`, {
        signal: AbortSignal.timeout(4000),
      })
      if (!response.ok) return []
      const data = (await response.json()) as { name?: string; country?: string; web_pages?: string[] }[]
      return data
        .filter((d) => typeof d.name === "string" && d.name.trim().length > 0)
        .map((d) => ({ name: d.name!.trim(), country: d.country ?? null, website: d.web_pages?.[0] ?? null }))
    } catch {
      return []
    }
  }

  /** Called when someone picks a directory result: reuses a matching
   *  catalog row if one exists, otherwise adds it. Directory entries come
   *  from a public list of accredited institutions, so they're stored
   *  VERIFIED (no HR review needed, unlike free-text manual entries). */
  async importFromDirectory(dto: CreateInstitutionDto) {
    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: dto.actingEmployeeId }, select: { employeeNumber: true } })
    if (!actor) throw new BadRequestException("Acting employee not found.")

    const existing = await this.prisma.academicInstitution.findFirst({
      where: {
        name: { equals: dto.name, mode: "insensitive" },
        ...(dto.country ? { country: { equals: dto.country, mode: "insensitive" } } : {}),
        verificationStatus: { not: "REJECTED" },
      },
    })
    if (existing) return existing

    return this.prisma.academicInstitution.create({
      data: {
        name: dto.name,
        country: dto.country,
        city: dto.city,
        website: dto.website,
        addedById: dto.actingEmployeeId,
        verificationStatus: "VERIFIED",
        verifiedById: dto.actingEmployeeId,
        verifiedAt: new Date(),
      },
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
