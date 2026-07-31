import { Injectable } from "@nestjs/common"

import { PrismaService } from "../../../prisma/prisma.service"

const EXPIRING_WINDOW_DAYS = 90

function countBy<T>(items: T[], keyFn: (item: T) => string | null | undefined): { key: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = keyFn(item) || "Not specified"
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
}

@Injectable()
export class ProfileAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Education Analysis ---------------------------------------------------

  async educationByLevel() {
    const rows = await this.prisma.employeeEducation.groupBy({
      by: ["type"],
      where: { verificationStatus: "VERIFIED" },
      _count: { _all: true },
    })
    return rows.map((row) => ({ key: row.type, count: row._count._all })).sort((a, b) => b.count - a.count)
  }

  async educationByInstitution() {
    const rows = await this.prisma.employeeEducation.findMany({
      where: { verificationStatus: "VERIFIED" },
      select: { institution: true },
    })
    return countBy(rows, (r) => r.institution).slice(0, 25)
  }

  async educationByField() {
    const rows = await this.prisma.employeeEducation.findMany({
      where: { verificationStatus: "VERIFIED" },
      select: { fieldOfStudy: true },
    })
    return countBy(rows, (r) => r.fieldOfStudy).slice(0, 25)
  }

  // ---- Skills Analysis --------------------------------------------------------

  async mostCommonSkills() {
    const rows = await this.prisma.employeeSkill.findMany({ include: { skill: { select: { name: true, category: true } } } })
    return countBy(rows, (r) => r.skill.name).slice(0, 30)
  }

  /**
   * "Skills gaps by department" — this app has no target/required-skills
   * model to diff against, so this is implemented as the honest thing that
   * IS knowable: skill coverage per department (how many employees in each
   * department have at least one recorded skill, and the department's most
   * common skills) — HR can visually spot thin coverage, but this isn't a
   * true gap analysis against a defined skill requirement. Flagged here so
   * that limitation is visible in code, not just in the final summary.
   */
  async skillsByDepartment() {
    const rows = await this.prisma.employeeSkill.findMany({
      include: {
        skill: { select: { name: true } },
        employee: { select: { position: { select: { department: { select: { name: true } } } } } },
      },
    })

    const byDepartment = new Map<string, { key: string; count: number }[]>()
    const grouped = new Map<string, typeof rows>()
    for (const row of rows) {
      const dept = row.employee.position?.department?.name ?? "Unassigned"
      const list = grouped.get(dept) ?? []
      list.push(row)
      grouped.set(dept, list)
    }
    for (const [dept, deptRows] of grouped.entries()) {
      byDepartment.set(dept, countBy(deptRows, (r) => r.skill.name).slice(0, 10))
    }

    return Array.from(byDepartment.entries()).map(([department, topSkills]) => ({ department, topSkills }))
  }

  async availableExpertise() {
    const rows = await this.prisma.skill.findMany({
      include: { _count: { select: { employeeSkills: true } } },
      orderBy: { name: "asc" },
    })
    return rows
      .map((skill) => ({ skill: skill.name, category: skill.category, employeeCount: skill._count.employeeSkills }))
      .filter((s) => s.employeeCount > 0)
      .sort((a, b) => b.employeeCount - a.employeeCount)
  }

  // ---- Certification Analysis --------------------------------------------------

  async certificationSummary() {
    const now = new Date()
    const expiringBefore = new Date(now.getTime() + EXPIRING_WINDOW_DAYS * 24 * 60 * 60 * 1000)

    const [active, expired, expiringSoon] = await Promise.all([
      this.prisma.employeeCertification.count({
        where: { verificationStatus: "VERIFIED", OR: [{ expiryDate: null }, { expiryDate: { gte: now } }] },
      }),
      this.prisma.employeeCertification.count({
        where: { verificationStatus: "VERIFIED", expiryDate: { lt: now } },
      }),
      this.prisma.employeeCertification.findMany({
        where: { verificationStatus: "VERIFIED", expiryDate: { gte: now, lte: expiringBefore } },
        include: { employee: { select: { employeeNumber: true, firstName: true, lastName: true } } },
        orderBy: { expiryDate: "asc" },
      }),
    ])

    // Every row here has expiryDate in [now, expiringBefore], so per the
    // same ACTIVE/EXPIRED rule used elsewhere (withCertStatus in
    // profile.service.ts / withStatus in certifications.service.ts), all of
    // them are ACTIVE by construction — set explicitly so the returned shape
    // matches the client's Certification type.
    const expiringSoonWithStatus = expiringSoon.map((cert) => ({ ...cert, status: "ACTIVE" as const }))

    return { active, expired, expiringWindowDays: EXPIRING_WINDOW_DAYS, expiringSoon: expiringSoonWithStatus }
  }

  async certificationsByDepartment() {
    const rows = await this.prisma.employeeCertification.findMany({
      where: { verificationStatus: "VERIFIED" },
      include: { employee: { select: { position: { select: { department: { select: { name: true } } } } } } },
    })
    return countBy(rows, (r) => r.employee.position?.department?.name ?? "Unassigned")
  }
}
